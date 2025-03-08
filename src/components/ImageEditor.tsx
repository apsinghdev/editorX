
import { useEditorStore, FilterType } from "@/store/editorStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  RefreshCw,
  Download,
  Expand,
  Filter,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";

const filterPresets: { name: string; type: FilterType; description: string }[] = [
  { name: "None", type: "none", description: "No filter" },
  { name: "Grayscale", type: "grayscale", description: "Black and white" },
  { name: "Sepia", type: "sepia", description: "Vintage look" },
  { name: "Blur", type: "blur", description: "Soft focus effect" },
  { name: "Brightness", type: "brightness", description: "Adjust lighting" },
  { name: "Contrast", type: "contrast", description: "Enhance details" },
  { name: "Saturation", type: "saturate", description: "Color intensity" },
  { name: "Invert", type: "invert", description: "Negative colors" },
];

export function ImageEditor() {
  const {
    imageState,
    rotateImage,
    flipImageHorizontal,
    flipImageVertical,
    resetImage,
    clearImage,
    downloadImage,
    applyFilter,
    setFilterIntensity,
    resizeImage,
  } = useEditorStore();

  const [dimensions, setDimensions] = useState({
    width: imageState.width,
    height: imageState.height,
  });

  if (!imageState.image) {
    return null;
  }

  const handleResize = () => {
    resizeImage(dimensions.width, dimensions.height);
    toast.success("Image resized successfully");
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const width = parseInt(e.target.value);
    const ratio = imageState.width / imageState.height;
    setDimensions({ 
      width, 
      height: Math.round(width / ratio) 
    });
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const height = parseInt(e.target.value);
    const ratio = imageState.width / imageState.height;
    setDimensions({ 
      width: Math.round(height * ratio), 
      height 
    });
  };

  const getFilterStyle = () => {
    if (imageState.filter === 'none') return {};
    
    const intensity = imageState.filterIntensity / 100;
    
    switch (imageState.filter) {
      case 'grayscale':
        return { filter: `grayscale(${intensity})` };
      case 'sepia':
        return { filter: `sepia(${intensity})` };
      case 'blur':
        return { filter: `blur(${intensity * 5}px)` };
      case 'brightness':
        return { filter: `brightness(${0.5 + intensity * 1.5})` };
      case 'contrast':
        return { filter: `contrast(${0.5 + intensity * 1.5})` };
      case 'saturate':
        return { filter: `saturate(${intensity * 2})` };
      case 'invert':
        return { filter: `invert(${intensity})` };
      default:
        return {};
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="relative mx-auto max-w-2xl">
        <div className="relative">
          <Button 
            variant="destructive" 
            size="sm" 
            className="absolute -top-2 -right-2 z-10 rounded-full p-2 shadow-md"
            onClick={clearImage}
            title="Reset canvas"
          >
            <X className="h-4 w-4" />
          </Button>
          <img
            src={imageState.image}
            alt="Editing preview"
            className="rounded-lg shadow-lg object-contain max-w-full max-h-[70vh]"
            style={{
              transform: `rotate(${imageState.rotation}deg) scale(${
                imageState.flipHorizontal ? -1 : 1
              }, ${imageState.flipVertical ? -1 : 1})`,
              ...getFilterStyle(),
            }}
          />
        </div>
      </div>

      <Card className="glass-panel rounded-xl overflow-hidden">
        <Tabs defaultValue="transform" className="w-full">
          <TabsList className="grid grid-cols-3 w-full p-1">
            <TabsTrigger value="transform" className="text-sm">
              Transform
            </TabsTrigger>
            <TabsTrigger value="filter" className="text-sm">
              Filters
            </TabsTrigger>
            <TabsTrigger value="export" className="text-sm">
              Export
            </TabsTrigger>
          </TabsList>

          <div className="p-4">
            <TabsContent value="transform" className="mt-0">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => rotateImage(-90)}
                    className="flex items-center gap-1"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Rotate Left</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => rotateImage(90)}
                    className="flex items-center gap-1"
                  >
                    <RotateCw className="h-4 w-4" />
                    <span>Rotate Right</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={flipImageHorizontal}
                    className={cn(
                      "flex items-center gap-1",
                      imageState.flipHorizontal && "bg-accent"
                    )}
                  >
                    <FlipHorizontal className="h-4 w-4" />
                    <span>Flip Horizontal</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={flipImageVertical}
                    className={cn(
                      "flex items-center gap-1",
                      imageState.flipVertical && "bg-accent"
                    )}
                  >
                    <FlipVertical className="h-4 w-4" />
                    <span>Flip Vertical</span>
                  </Button>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">Resize Image</h3>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <Expand className="h-4 w-4" />
                          <span>Resize</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Resize Image</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label htmlFor="width" className="text-sm font-medium">
                                Width (px)
                              </label>
                              <Input
                                id="width"
                                type="number"
                                value={dimensions.width}
                                onChange={handleWidthChange}
                              />
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="height" className="text-sm font-medium">
                                Height (px)
                              </label>
                              <Input
                                id="height"
                                type="number"
                                value={dimensions.height}
                                onChange={handleHeightChange}
                              />
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Original dimensions: {imageState.width} x {imageState.height}
                          </div>
                          <Button onClick={handleResize}>Apply Resize</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="filter" className="mt-0">
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {filterPresets.map((filter) => (
                    <Card 
                      key={filter.type}
                      className={cn(
                        "overflow-hidden cursor-pointer filter-preview-effect", 
                        imageState.filter === filter.type && "ring-2 ring-primary ring-offset-2"
                      )}
                      onClick={() => applyFilter(filter.type)}
                    >
                      <div className="p-2 bg-muted/50">
                        <div className="w-full h-20 bg-cover bg-center rounded relative overflow-hidden">
                          {imageState.image && (
                            <img 
                              src={imageState.image} 
                              alt={filter.name}
                              className="w-full h-full object-cover"
                              style={{
                                filter: 
                                  filter.type === 'grayscale' ? 'grayscale(1)' :
                                  filter.type === 'sepia' ? 'sepia(1)' :
                                  filter.type === 'blur' ? 'blur(2px)' :
                                  filter.type === 'brightness' ? 'brightness(1.5)' :
                                  filter.type === 'contrast' ? 'contrast(1.5)' :
                                  filter.type === 'saturate' ? 'saturate(2)' :
                                  filter.type === 'invert' ? 'invert(0.8)' :
                                  'none'
                              }}
                            />
                          )}
                        </div>
                      </div>
                      <div className="p-2">
                        <h3 className="text-sm font-medium">{filter.name}</h3>
                        <p className="text-xs text-muted-foreground">{filter.description}</p>
                      </div>
                    </Card>
                  ))}
                </div>

                {imageState.filter !== 'none' && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Intensity</h3>
                      <span className="text-xs">{imageState.filterIntensity}%</span>
                    </div>
                    <Slider
                      value={[imageState.filterIntensity]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(value) => setFilterIntensity(value[0])}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="export" className="mt-0">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={resetImage}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Reset to Original</span>
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={clearImage}
                    className="flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    <span>Reset Canvas</span>
                  </Button>
                  <Button
                    onClick={downloadImage}
                    className="btn-primary-glow flex items-center gap-1"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Edited Image</span>
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground pt-2">
                  <p>File: {imageState.name}</p>
                  <p>Dimensions: {imageState.width} x {imageState.height} px</p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
