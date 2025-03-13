import { useEditorStore, FilterType } from "@/store/editorStore";
import { InferenceSession, Tensor } from "onnxruntime-web";
import * as ort from "onnxruntime-web";
/* @ts-ignore */
import npyjs from "npyjs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as _ from "underscore";
import { modelInputProps } from "./helpers/Interfaces";
import { handleImageScale } from "./helpers/scaleHelper";
import { modelScaleProps } from "./helpers/Interfaces";
import { modelData } from "./helpers/onnxModelAPI";
import { onnxMaskToImage } from "./helpers/maskUtils";
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
  Scissors,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const filterPresets: { name: string; type: FilterType; description: string }[] =
  [
    { name: "None", type: "none", description: "No filter" },
    { name: "Grayscale", type: "grayscale", description: "Black and white" },
    { name: "Sepia", type: "sepia", description: "Vintage look" },
    { name: "Blur", type: "blur", description: "Soft focus effect" },
    { name: "Brightness", type: "brightness", description: "Adjust lighting" },
    { name: "Contrast", type: "contrast", description: "Enhance details" },
    { name: "Saturation", type: "saturate", description: "Color intensity" },
    { name: "Invert", type: "invert", description: "Negative colors" },
  ];

const IMAGE_EMBEDDING = `src/assets/data/ajeet_embedding.npy`;
const MODEL_DIR = `${window.location.origin}/model/sam_onnx_quantized_example.onnx`;

export function ImageEditor() {
  const {
    advanceMode,
    imageState,
    maskImg,
    clicks,
    userPrompt,
    setPrompt,
    setAdvanceMode,
    setImage,
    setClicks,
    setMaskImg,
    rotateImage,
    flipImageHorizontal,
    flipImageVertical,
    resetImage,
    clearImage,
    downloadImage,
    applyFilter,
    setFilterIntensity,
    resizeImage,
    removeBackground: removeImageBackground,
    fillImageWithMask: modifyTheImage,
  } = useEditorStore();

  const [dimensions, setDimensions] = useState({
    width: imageState.width,
    height: imageState.height,
  });

  const [apiKey, setApiKey] = useState("");
  const [falApiKey, setFalApiKey] = useState("");
  const [isRemoveBgDialogOpen, setIsRemoveBgDialogOpen] = useState(false);
  const [isFalDialogOpen, setFalDialogOpen] = useState(false);
  const [model, setModel] = useState<InferenceSession | null>(null); // ONNX model
  const [tensor, setTensor] = useState<Tensor | null>(null); // Image embedding tensor
  // The ONNX model expects the input to be rescaled to 1024.
  // The modelScale state variable keeps track of the scale values.
  const [modelScale, setModelScale] = useState<modelScaleProps | null>(null);

  const imageClasses = "";
  const maskImageClasses = `top-0 left-0 absolute opacity-40 pointer-events-none z-10`;

  if (!imageState.image) {
    return null;
  }

  const handleResize = () => {
    resizeImage(dimensions.width, dimensions.height);
    toast.success("Image resized successfully");
  };

  const handleTabValueChange = (value: string) => {
    if (value === "advance") {
      handleAdvanceMode();
    } else {
      setAdvanceMode(false);
    }
  };

  const handleUserPrompt = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
  };

  const [shouldFitToWidth, setShouldFitToWidth] = useState(true);
  const bodyEl = document.body;
  const fitToPage = () => {
    if (!imageState.image) return;
    const imageAspectRatio = imageState.width / imageState.height;
    const screenAspectRatio = window.innerWidth / window.innerHeight;
    setShouldFitToWidth(imageAspectRatio > screenAspectRatio);
  };
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === bodyEl) {
        fitToPage();
      }
    }
  });
  useEffect(() => {
    fitToPage();
    resizeObserver.observe(bodyEl);
    return () => {
      resizeObserver.unobserve(bodyEl);
    };
  }, [imageState.image]);

  useEffect(() => {
    if (maskImg) {
      toast.success("Segment selected");
    } else {
      toast.error("Segment cleared");
    }
  }, [maskImg]);

  useEffect(() => {
    // Initialize the ONNX model
    const initModel = async () => {
      try {
        if (MODEL_DIR === undefined) return;
        const URL: string = MODEL_DIR;
        const URI = URL.toString();
        const model = await InferenceSession.create(URI);
        setModel(model);
      } catch (e) {
        console.log(e);
      }
    };
    initModel();

    // Load the image
    const url = new URL(imageState.image, location.origin);
    loadImage(url);

    // Load the Segment Anything pre-computed embedding
    Promise.resolve(loadNpyTensor(IMAGE_EMBEDDING, "float32")).then(
      (embedding) => setTensor(embedding)
    );
  }, [setModel, clicks]);

  const loadImage = async (url: URL) => {
    try {
      const img = new Image();
      img.src = url.href;
      img.onload = () => {
        const { height, width, samScale } = handleImageScale(img);
        setModelScale({
          height: height, // original image height
          width: width, // original image width
          samScale: samScale, // scaling factor for image which has been resized to longest side 1024
        });
        img.width = width;
        img.height = height;
        setImage(img);
      };
    } catch (error) {
      console.log(error);
    }
  };

  // Decode a Numpy file into a tensor.
  const loadNpyTensor = async (tensorFile: string, dType: string) => {
    let npLoader = new npyjs();
    const npArray = await npLoader.load(tensorFile);
    const tensor = new ort.Tensor(dType, npArray.data, npArray.shape);
    return tensor;
  };

  // Run the ONNX model every time clicks has changed
  useEffect(() => {
    runONNX();
  }, [clicks]);

  const runONNX = async () => {
    try {
      if (
        model === null ||
        clicks === null ||
        tensor === null ||
        modelScale === null
      ) {
        return;
      } else {
        // Preapre the model input in the correct format for SAM.
        // The modelData function is from onnxModelAPI.tsx.
        const feeds = modelData({
          clicks,
          tensor,
          modelScale,
        });
        if (feeds === undefined) return;
        // Run the SAM ONNX model with the feeds returned from modelData()
        const results = await model.run(feeds);
        const output = results[model.outputNames[0]];
        // The predicted mask returned from the ONNX model is an array which is
        // rendered as an HTML image using onnxMaskToImage() from maskUtils.tsx.
        setMaskImg(
          onnxMaskToImage(output.data, output.dims[2], output.dims[3])
        );
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleAdvanceMode = () => {
    setAdvanceMode(true);
  };

  const getClick = (x: number, y: number): modelInputProps => {
    const clickType = 1;
    return { x, y, clickType };
  };

  const handleClickOnImage = _.throttle((e: any) => {
    let el = e.nativeEvent.target;
    const rect = el.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    const imageScale = imageState.image ? imageState.width / el.offsetWidth : 1;
    x *= imageScale;
    y *= imageScale;
    const click = getClick(x, y);
    if (click) setClicks([click]);
  }, 15);

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const width = parseInt(e.target.value);
    const ratio = imageState.width / imageState.height;
    setDimensions({
      width,
      height: Math.round(width / ratio),
    });
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const height = parseInt(e.target.value);
    const ratio = imageState.width / imageState.height;
    setDimensions({
      width: Math.round(height * ratio),
      height,
    });
  };

  const handleRemoveBackground = async () => {
    if (!apiKey.trim()) {
      toast.error("API key is required");
      return;
    }

    await removeImageBackground(apiKey);
    setIsRemoveBgDialogOpen(false);
  };

  const handleModifyTheImage = async () => {
    await modifyTheImage(imageState.image, maskImg, falApiKey, userPrompt);
    setFalDialogOpen(false);
  };

  const getFilterStyle = () => {
    if (imageState.filter === "none") return {};

    const intensity = imageState.filterIntensity / 100;

    switch (imageState.filter) {
      case "grayscale":
        return { filter: `grayscale(${intensity})` };
      case "sepia":
        return { filter: `sepia(${intensity})` };
      case "blur":
        return { filter: `blur(${intensity * 5}px)` };
      case "brightness":
        return { filter: `brightness(${0.5 + intensity * 1.5})` };
      case "contrast":
        return { filter: `contrast(${0.5 + intensity * 1.5})` };
      case "saturate":
        return { filter: `saturate(${intensity * 2})` };
      case "invert":
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
          {!advanceMode ? (
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
          ) : (
            <>
              {imageState.image && (
                <img
                  onClick={handleClickOnImage}
                  // onMouseOut={() => _.defer(() => setMaskImg(null))}
                  onTouchStart={handleClickOnImage}
                  src={imageState.image}
                  className={`${
                    shouldFitToWidth ? "w-full" : "h-full"
                  } ${imageClasses}`}
                ></img>
              )}
              {maskImg && (
                <img
                  src={maskImg.src}
                  className={`${
                    shouldFitToWidth ? "w-full" : "h-full"
                  } ${maskImageClasses}`}
                ></img>
              )}
            </>
          )}
        </div>
      </div>

      <Card className="glass-panel rounded-xl overflow-hidden">
        <Tabs
          defaultValue="transform"
          onValueChange={handleTabValueChange}
          className="w-full"
        >
          <TabsList className="grid grid-cols-4 w-full p-1">
            <TabsTrigger value="transform" className="text-sm">
              Transform
            </TabsTrigger>
            <TabsTrigger value="filter" className="text-sm">
              Filters
            </TabsTrigger>
            <TabsTrigger value="advance" className="text-sm">
              Advance
            </TabsTrigger>
            <TabsTrigger value="export" className="text-sm">
              Export
            </TabsTrigger>
          </TabsList>

          <div className="p-4">
            <TabsContent value="advance" className="mt-0">
              <div className="space-y-4 flex flex-col">
                <p>
                  Segmentation activated. Please click on the part of the image
                  you want to change.
                </p>
                <Input
                  placeholder="Enter a prompt"
                  onChange={handleUserPrompt}
                ></Input>
                <Button onClick={() => setFalDialogOpen(true)}>Generate</Button>
              </div>
            </TabsContent>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRemoveBgDialogOpen(true)}
                    className="flex items-center gap-1"
                  >
                    <Scissors className="h-4 w-4" />
                    <span>Remove Background</span>
                  </Button>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">Resize Image</h3>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
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
                              <label
                                htmlFor="width"
                                className="text-sm font-medium"
                              >
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
                              <label
                                htmlFor="height"
                                className="text-sm font-medium"
                              >
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
                            Original dimensions: {imageState.width} x{" "}
                            {imageState.height}
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
                        imageState.filter === filter.type &&
                          "ring-2 ring-primary ring-offset-2"
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
                                  filter.type === "grayscale"
                                    ? "grayscale(1)"
                                    : filter.type === "sepia"
                                    ? "sepia(1)"
                                    : filter.type === "blur"
                                    ? "blur(2px)"
                                    : filter.type === "brightness"
                                    ? "brightness(1.5)"
                                    : filter.type === "contrast"
                                    ? "contrast(1.5)"
                                    : filter.type === "saturate"
                                    ? "saturate(2)"
                                    : filter.type === "invert"
                                    ? "invert(0.8)"
                                    : "none",
                              }}
                            />
                          )}
                        </div>
                      </div>
                      <div className="p-2">
                        <h3 className="text-sm font-medium">{filter.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {filter.description}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>

                {imageState.filter !== "none" && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Intensity</h3>
                      <span className="text-xs">
                        {imageState.filterIntensity}%
                      </span>
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
                  <p>
                    Dimensions: {imageState.width} x {imageState.height} px
                  </p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      <Dialog open={isFalDialogOpen} onOpenChange={setFalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify the image</DialogTitle>
            <DialogDescription>
              Enter your Fal-ai API key to process this image. You can get a
              free API key at{" "}
              <a
                href="https://fal.ai/models/fal-ai/Fal-lora-fill"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Fal.ai
              </a>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="fal-api-key" className="text-sm font-medium">
                API Key
              </label>
              <Input
                id="fal-api-key"
                type="password"
                value={falApiKey}
                onChange={(e) => setFalApiKey(e.target.value)}
                placeholder="Enter your fal.ai API key"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFalDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleModifyTheImage}>Ok</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isRemoveBgDialogOpen}
        onOpenChange={setIsRemoveBgDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Image Background</DialogTitle>
            <DialogDescription>
              Enter your remove.bg API key to process this image. You can get a
              free API key at{" "}
              <a
                href="https://www.remove.bg/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                remove.bg
              </a>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="api-key" className="text-sm font-medium">
                API Key
              </label>
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your remove.bg API key"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRemoveBgDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRemoveBackground}>Remove Background</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
