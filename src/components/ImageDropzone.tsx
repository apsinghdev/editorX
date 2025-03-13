import { useCallback, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ImageDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const { setImage } = useEditorStore();

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [setImage]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [setImage]
  );

  const processFile = useCallback(
    (file: File) => {
      // Check if file is an image
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size should be less than 10MB");
        return;
      }

      setImage(file);
    },
    [setImage]
  );

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[300px] p-6 rounded-xl image-drag-area transition-all animate-fade-in",
        isDragging && "image-drag-area-active scale-[1.02]"
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 rounded-full bg-primary/10 p-3">
          <Upload className="h-6 w-6 text-primary animate-pulse-soft" />
        </div>
        <h3 className="mb-2 text-lg font-medium">Drag and drop your image</h3>
        <p className="mb-4 text-sm text-muted-foreground max-w-[20rem]">
          Upload a JPG, PNG, or GIF file (max 10MB)
        </p>
        <label
          htmlFor="file-upload"
          className="btn-primary-glow rounded-lg px-4 py-2 text-sm cursor-pointer"
        >
          Select from computer
        </label>
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          className="sr-only"
          accept="image/*"
          onChange={handleFileInput}
        />
      </div>
    </div>
  );
}
