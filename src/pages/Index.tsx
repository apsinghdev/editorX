
import { Header } from "@/components/Header";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ImageEditor } from "@/components/ImageEditor";
import { useEditorStore } from "@/store/editorStore";

const Index = () => {
  const { imageState } = useEditorStore();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-sky-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-2">
            EditorX
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A simple, elegant image editor with essential tools for quick adjustments.
          </p>
        </div>

        <div className="mx-auto max-w-4xl">
          {!imageState.image ? (
            <ImageDropzone />
          ) : (
            <ImageEditor />
          )}
        </div>
      </main>
      
      <footer className="py-6 border-t dark:border-gray-700">
        <div className="container max-w-6xl mx-auto px-4">
          <p className="text-sm text-center text-muted-foreground">
            Designed with simplicity and elegance in mind by Ajeet. &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Index;
