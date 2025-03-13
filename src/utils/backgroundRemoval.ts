import { toast } from "sonner";

export const removeBackground = async (
  imageUrl: string,
  apiKey: string
): Promise<string | null> => {
  try {
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();

    const formData = new FormData();
    formData.append("image_file", imageBlob, "image.jpg");
    formData.append("size", "auto");

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.errors?.[0]?.title || "Failed to remove background"
      );
    }

    const resultBlob = await response.blob();
    const resultUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(resultBlob);
    });

    return resultUrl;
  } catch (error) {
    console.error("Error removing background:", error);
    toast.error(
      error instanceof Error ? error.message : "Failed to remove background"
    );
    return null;
  }
};
