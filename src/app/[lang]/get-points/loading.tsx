import { Loader2 } from "lucide-react";

export default function GetPointsLoading() {
  return (
    <main className="flex flex-1 justify-center bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 sm:py-12">
      <div className="flex w-full max-w-3xl items-center justify-center rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    </main>
  );
}

