import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// This is your homepage. Replace it with your own idea — that is the point
// of the day. Components come from src/components/ui (shadcn/ui: they are
// local source files you and your AI agent can freely edit).

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>It works!</CardTitle>
          <CardDescription>
            Next.js + Tailwind + shadcn/ui starter — your website begins here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Edit <code>src/app/page.tsx</code> and this page updates live.
          </p>
          <Button
            className="w-fit"
            render={
              <a
                href="https://ui.shadcn.com/docs/components"
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            Browse components
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
