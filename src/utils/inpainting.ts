import { fal } from "@fal-ai/client";
import { toast } from "sonner";


// Function to resize an image
const resizeImage = (
  imageUrl: string,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
      
      // Create canvas for resizing
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      
      // Draw and resize image
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convert to data URL with compression
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    
    img.onerror = reject;
    img.src = imageUrl;
  });
};

export const fillImageWithMask = async (
  imageUrl: string | File | Blob | HTMLImageElement,
  maskUrl: string | File | Blob | HTMLImageElement,
  apiKey: string,
  prompt: string
): Promise<string | null> => {
  
  fal.config({
    credentials: apiKey,
  });

  try {
    // Check if we need to handle local files
    let processedImageUrl = imageUrl;
    let processedMaskUrl = maskUrl;

    // If the URLs are local files or HTML elements, convert them
    if (
      imageUrl instanceof File ||
      imageUrl instanceof Blob ||
      imageUrl instanceof HTMLImageElement
    ) {
      processedImageUrl =
        imageUrl instanceof HTMLImageElement
          ? imageUrl.src
          : await fileToDataUrl(imageUrl);
    } else if (typeof imageUrl === "string") {
      processedImageUrl = imageUrl;
    }

    if (
      maskUrl instanceof File ||
      maskUrl instanceof Blob ||
      maskUrl instanceof HTMLImageElement
    ) {
      processedMaskUrl =
        maskUrl instanceof HTMLImageElement
          ? maskUrl.src
          : await fileToDataUrl(maskUrl);
    } else if (typeof maskUrl === "string") {
      processedMaskUrl = maskUrl;
    }

    const resizedImageUrl = await resizeImage(processedImageUrl as string, 1024, 1024, 0.8);

    const response = await fal.subscribe("fal-ai/flux-lora-fill", {
      input: {
        prompt: prompt,
        image_url: resizedImageUrl,
        mask_url: processedMaskUrl as string,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    const result = response.data;

    // Return the URL of the first generated image
    if (result.images && result.images.length > 0) {
      return result.images[0].url;
    } else {
      throw new Error("No images returned from the API");
    }
  } catch (error) {
    console.error("Error filling image with mask:", error);
    toast.error(
      error instanceof Error ? error.message : "Failed to process image"
    );
    return null;
  }
};

// Helper function to convert File or Blob to data URL
const fileToDataUrl = (file: File | Blob): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
};
