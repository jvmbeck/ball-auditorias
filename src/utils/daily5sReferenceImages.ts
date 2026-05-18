const DEFAULT_MAX_IMAGES_PER_PROCESS = 10;
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

function buildImageUrl(processKey: string, imageIndex: number, extension: string): string {
  return `/daily5s-reference-images/${processKey}/nota-5-${imageIndex}.${extension}`;
}

function imageExists(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  });
}

export async function getProcessReferenceImages(
  processKey: string,
  maxImagesPerProcess = DEFAULT_MAX_IMAGES_PER_PROCESS,
): Promise<string[]> {
  const urls: string[] = [];

  for (let imageIndex = 1; imageIndex <= maxImagesPerProcess; imageIndex += 1) {
    const extensionChecks = await Promise.all(
      IMAGE_EXTENSIONS.map(async (extension) => {
        const url = buildImageUrl(processKey, imageIndex, extension);
        const exists = await imageExists(url);
        return exists ? url : null;
      }),
    );

    const existingUrl = extensionChecks.find((value): value is string => value !== null);
    if (existingUrl) {
      urls.push(existingUrl);
    }
  }

  return urls;
}
