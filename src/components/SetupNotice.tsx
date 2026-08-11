import { PROGRAM_NAME } from "@/lib/program";

/** Shown when the Supabase env vars are missing, so a fresh clone explains itself. */
export function SetupNotice() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="card max-w-md space-y-3 p-6">
        <h1 className="text-xl font-extrabold">Almost there</h1>
        <p className="text-sm text-muted">
          {PROGRAM_NAME} needs its Supabase keys. Copy <code>.env.example</code> to{" "}
          <code>.env.local</code>, fill in the project URL and anon key, then restart the
          dev server.
        </p>
        <p className="text-sm text-muted">
          The setup steps are in the README under &ldquo;Connecting Supabase&rdquo;.
        </p>
      </div>
    </div>
  );
}
