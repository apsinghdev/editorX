import { create } from 'zustand';
import { toast } from 'sonner';
import { removeBackground } from '@/utils/backgroundRemoval';

export type FilterType = 
  | 'none'
  | 'grayscale'
  | 'sepia'
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'saturate'
  | 'invert';

export interface ImageState {
  image: string | null;
  originalImage: string | null;
  name: string;
  width: number;
  height: number;
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  filter: FilterType;
  filterIntensity: number;
}

interface EditorStore {
  // Image state
  imageState: ImageState;
  
  // Actions
  setImage: (imageFile: File) => void;
  resetImage: () => void;
  clearImage: () => void;
  
  // Transformations
  resizeImage: (width: number, height: number) => void;
  rotateImage: (angle: number) => void;
  flipImageHorizontal: () => void;
  flipImageVertical: () => void;
  
  // Filters
  applyFilter: (filter: FilterType) => void;
  setFilterIntensity: (intensity: number) => void;
  
  // Background removal
  removeBackground: (apiKey: string) => Promise<void>;
  
  // Export
  downloadImage: () => void;
}

const initialImageState: ImageState = {
  image: null,
  originalImage: null,
  name: '',
  width: 0,
  height: 0,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  filter: 'none',
  filterIntensity: 100,
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  imageState: { ...initialImageState },
  
  setImage: async (imageFile: File) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          set({
            imageState: {
              ...initialImageState,
              image: e.target?.result as string,
              originalImage: e.target?.result as string,
              name: imageFile.name,
              width: img.width,
              height: img.height,
            }
          });
          toast.success('Image uploaded successfully');
        };
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => {
        toast.error('Failed to read the image');
      };
      
      reader.readAsDataURL(imageFile);
    } catch (error) {
      toast.error('Error uploading image');
      console.error(error);
    }
  },
  
  resetImage: () => {
    const { originalImage, name } = get().imageState;
    if (originalImage) {
      const img = new Image();
      img.onload = () => {
        set({
          imageState: {
            ...initialImageState,
            image: originalImage,
            originalImage,
            name,
            width: img.width,
            height: img.height,
          }
        });
        toast.success('Image reset to original');
      };
      img.src = originalImage;
    }
  },
  
  clearImage: () => {
    set({
      imageState: { ...initialImageState }
    });
    toast.success('Canvas cleared successfully');
  },
  
  resizeImage: (width: number, height: number) => {
    set((state) => ({
      imageState: {
        ...state.imageState,
        width,
        height,
      }
    }));
  },
  
  rotateImage: (angle: number) => {
    set((state) => ({
      imageState: {
        ...state.imageState,
        rotation: (state.imageState.rotation + angle) % 360,
      }
    }));
  },
  
  flipImageHorizontal: () => {
    set((state) => ({
      imageState: {
        ...state.imageState,
        flipHorizontal: !state.imageState.flipHorizontal,
      }
    }));
  },
  
  flipImageVertical: () => {
    set((state) => ({
      imageState: {
        ...state.imageState,
        flipVertical: !state.imageState.flipVertical,
      }
    }));
  },
  
  applyFilter: (filter: FilterType) => {
    set((state) => ({
      imageState: {
        ...state.imageState,
        filter,
      }
    }));
  },
  
  setFilterIntensity: (intensity: number) => {
    set((state) => ({
      imageState: {
        ...state.imageState,
        filterIntensity: intensity,
      }
    }));
  },
  
  removeBackground: async (apiKey: string) => {
    const { image } = get().imageState;
    
    if (!image) {
      toast.error('No image to process');
      return;
    }
    
    toast.loading('Removing background...');
    
    const resultImage = await removeBackground(image, apiKey);
    
    if (resultImage) {
      const img = new Image();
      img.onload = () => {
        set((state) => ({
          imageState: {
            ...state.imageState,
            image: resultImage,
            width: img.width,
            height: img.height,
          }
        }));
        toast.dismiss();
        toast.success('Background removed successfully');
      };
      img.onerror = () => {
        toast.dismiss();
        toast.error('Failed to load the processed image');
      };
      img.src = resultImage;
    } else {
      toast.dismiss();
    }
  },
  
  downloadImage: () => {
    const { image, name } = get().imageState;
    
    if (!image) {
      toast.error('No image to download');
      return;
    }
    
    try {
      // Create a canvas to apply all transformations
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        toast.error('Unable to create canvas context');
        return;
      }
      
      const state = get().imageState;
      const img = new Image();
      
      img.onload = () => {
        // Set canvas dimensions
        const useWidth = state.width;
        const useHeight = state.height;
        
        // Adjust canvas size for rotation if needed
        if (state.rotation % 180 !== 0) {
          canvas.width = useHeight;
          canvas.height = useWidth;
        } else {
          canvas.width = useWidth;
          canvas.height = useHeight;
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Apply transformations
        ctx.save();
        
        // Move to center for rotation
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        // Rotate
        ctx.rotate((state.rotation * Math.PI) / 180);
        
        // Flip
        ctx.scale(
          state.flipHorizontal ? -1 : 1, 
          state.flipVertical ? -1 : 1
        );
        
        // Draw image centered
        ctx.drawImage(
          img, 
          -useWidth / 2, 
          -useHeight / 2, 
          useWidth, 
          useHeight
        );
        
        // Apply filters
        if (state.filter !== 'none') {
          const intensity = state.filterIntensity / 100;
          let filterString = '';
          
          switch(state.filter) {
            case 'grayscale':
              filterString = `grayscale(${intensity})`;
              break;
            case 'sepia':
              filterString = `sepia(${intensity})`;
              break;
            case 'blur':
              filterString = `blur(${intensity * 10}px)`;
              break;
            case 'brightness':
              filterString = `brightness(${0.5 + intensity * 1.5})`;
              break;
            case 'contrast':
              filterString = `contrast(${0.5 + intensity * 1.5})`;
              break;
            case 'saturate':
              filterString = `saturate(${intensity * 2})`;
              break;
            case 'invert':
              filterString = `invert(${intensity})`;
              break;
          }
          
          if (filterString) {
            ctx.filter = filterString;
            ctx.drawImage(
              img, 
              -useWidth / 2, 
              -useHeight / 2, 
              useWidth, 
              useHeight
            );
          }
        }
        
        ctx.restore();
        
        // Convert to data URL and download
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `edited-${name}`;
        link.href = dataUrl;
        link.click();
        
        toast.success('Image downloaded successfully');
      };
      
      img.src = image;
      
    } catch (error) {
      toast.error('Error downloading image');
      console.error(error);
    }
  },
}));
