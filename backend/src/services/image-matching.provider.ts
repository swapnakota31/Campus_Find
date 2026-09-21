import { config } from '../config';

export interface ImageMatchingProvider {
  readonly name: string;
  compareImages(lostImage: Buffer, foundImage: Buffer): Promise<number>;
}

/**
 * Development-only provider. It compares byte histograms, not visual features,
 * and must be replaced by a vision/embedding provider for production AI use.
 */
export class DevelopmentImageMatchingProvider implements ImageMatchingProvider {
  readonly name = 'development-mock';

  async compareImages(lostImage: Buffer, foundImage: Buffer): Promise<number> {
    if (lostImage.length === 0 || foundImage.length === 0) return 0;

    const lostHistogram = this.histogram(lostImage);
    const foundHistogram = this.histogram(foundImage);
    let dot = 0;
    let lostMagnitude = 0;
    let foundMagnitude = 0;

    for (let index = 0; index < lostHistogram.length; index++) {
      dot += lostHistogram[index] * foundHistogram[index];
      lostMagnitude += lostHistogram[index] ** 2;
      foundMagnitude += foundHistogram[index] ** 2;
    }

    if (lostMagnitude === 0 || foundMagnitude === 0) return 0;
    return Math.max(0, Math.min(1, dot / Math.sqrt(lostMagnitude * foundMagnitude)));
  }

  private histogram(image: Buffer): number[] {
    const histogram = Array.from({ length: 16 }, () => 0);
    for (const byte of image) histogram[byte >> 4]++;
    const magnitude = Math.sqrt(histogram.reduce((sum, value) => sum + value ** 2, 0));
    return magnitude === 0 ? histogram : histogram.map(value => value / magnitude);
  }
}

class UnavailableImageMatchingProvider implements ImageMatchingProvider {
  constructor(public readonly name: string) {}

  async compareImages(): Promise<number> {
    throw new Error(`Image matching provider '${this.name}' is not configured.`);
  }
}

export const imageMatchingProvider: ImageMatchingProvider =
  config.imageMatchingProvider === 'development-mock'
    ? new DevelopmentImageMatchingProvider()
    : new UnavailableImageMatchingProvider(config.imageMatchingProvider);