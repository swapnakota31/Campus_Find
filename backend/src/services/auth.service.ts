import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { AppError } from '../utils/errors';
import { generateSecureOTP, hashOTP, verifyOTPHash } from '../utils/otp';
import { emailService } from './email.service';

export interface UserResponse {
  id: string;
  collegeEmail: string;
  role: Role;
  createdAt?: Date;
}

export interface VerifyOtpResult {
  token: string;
  user: UserResponse;
}

export class AuthService {
  /**
   * Validates email format and college domain eligibility.
   */
  public validateEmailDomain(email: string): string {
    if (!email || typeof email !== 'string') {
      throw new AppError('Email address is required.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new AppError('Invalid email format.', 400);
    }

    const domain = normalizedEmail.split('@')[1];
    if (!config.allowedEmailDomains.includes(domain)) {
      throw new AppError(
        `Email domain '${domain}' is not authorized for registration. Allowed domain(s): ${config.allowedEmailDomains.join(', ')}`,
        400
      );
    }

    return normalizedEmail;
  }

  /**
   * Initiates OTP request flow for college email authentication.
   */
  public async requestOTP(rawEmail: string): Promise<{ message: string }> {
    const email = this.validateEmailDomain(rawEmail);

    // Cooldown check to prevent spamming OTP requests
    const recentOtp = await prisma.oTP.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      const secondsSinceLastRequest = Math.floor(
        (Date.now() - new Date(recentOtp.createdAt).getTime()) / 1000
      );
      if (secondsSinceLastRequest < config.otpCooldownSeconds) {
        const waitTime = config.otpCooldownSeconds - secondsSinceLastRequest;
        throw new AppError(
          `Please wait ${waitTime} seconds before requesting another OTP code.`,
          429
        );
      }
    }

    // Invalidate prior unused OTPs for this email to maintain single active OTP
    await prisma.oTP.updateMany({
      where: { email, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate cryptographic OTP and salted hash
    const otp = generateSecureOTP();
    const hashedOtp = hashOTP(otp, email);
    const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);

    // Store in PostgreSQL database
    await prisma.oTP.create({
      data: {
        email,
        hashedOtp,
        expiresAt,
      },
    });

    // Send email via EmailService abstraction
    await emailService.sendOTP({
      email,
      otp,
      expiresInMinutes: config.otpExpiryMinutes,
    });

    return {
      message: 'Verification code sent to email.',
    };
  }

  /**
   * Verifies OTP code, handles attempt limits, marks OTP used, and authenticates/creates User.
   */
  public async verifyOTP(rawEmail: string, rawOtp: string): Promise<VerifyOtpResult> {
    if (!rawEmail || !rawOtp) {
      throw new AppError('Email address and OTP code are required.', 400);
    }

    const email = rawEmail.trim().toLowerCase();
    const otp = rawOtp.trim();

    // Fetch latest OTP record for this email
    const otpRecord = await prisma.oTP.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new AppError('No OTP request found for this email address.', 400);
    }

    // Check single-use status
    if (otpRecord.usedAt !== null) {
      throw new AppError('This OTP code has already been used. Please request a new code.', 400);
    }

    // Check attempt limit
    if (otpRecord.attempts >= config.otpMaxAttempts) {
      throw new AppError('Maximum verification attempts exceeded. Please request a new OTP code.', 400);
    }

    // Check expiration
    if (new Date() > new Date(otpRecord.expiresAt)) {
      throw new AppError('This OTP code has expired. Please request a new code.', 400);
    }

    // Perform timing-safe hash comparison
    const isValid = verifyOTPHash(otp, email, otpRecord.hashedOtp);

    if (!isValid) {
      // Increment attempt count on failure
      await prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });

      const remainingAttempts = config.otpMaxAttempts - (otpRecord.attempts + 1);
      if (remainingAttempts <= 0) {
        throw new AppError('Maximum verification attempts exceeded. Please request a new OTP code.', 400);
      }

      throw new AppError(`Invalid OTP code. ${remainingAttempts} attempt(s) remaining.`, 400);
    }

    // Mark OTP as used upon successful verification
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    // Find existing user or create a new student user
    let user = await prisma.user.findUnique({
      where: { collegeEmail: email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          collegeEmail: email,
          role: Role.STUDENT, // Default role for signup is strictly STUDENT
        },
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        collegeEmail: user.collegeEmail,
        role: user.role,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    return {
      token,
      user: {
        id: user.id,
        collegeEmail: user.collegeEmail,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Retrieves user details by user ID.
   */
  public async getUserById(userId: string): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    return {
      id: user.id,
      collegeEmail: user.collegeEmail,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
