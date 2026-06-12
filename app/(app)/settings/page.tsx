import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { resolveModel } from "@/lib/openrouter/client";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import type { UserProfile, Workspace } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const modelEnv = [
    { purpose: "Long analysis", envVar: "DEFAULT_LONG_ANALYSIS_MODEL", value: resolveModel("long_analysis") },
    { purpose: "Fast drafting", envVar: "DEFAULT_FAST_DRAFT_MODEL", value: resolveModel("fast_draft") },
    { purpose: "Final writing", envVar: "DEFAULT_FINAL_WRITING_MODEL", value: resolveModel("final_writing") },
    { purpose: "Verifier / compliance", envVar: "DEFAULT_VERIFIER_MODEL", value: resolveModel("verifier") },
  ];

  let profiles: UserProfile[] = [];
  let workspaces: Workspace[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const [profilesRes, workspacesRes] = await Promise.all([
        supabase.from("users_profile").select("*").order("created_at"),
        supabase.from("workspaces").select("*").order("created_at"),
      ]);
      profiles = (profilesRes.data ?? []) as UserProfile[];
      workspaces = (workspacesRes.data ?? []) as Workspace[];
    } catch {
      // ignore — settings page still renders env info
    }
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Settings"
        description="OpenRouter API, model routing, prompt library, roles, workspaces, and compliance rules."
      />
      <SettingsTabs
        modelEnv={modelEnv}
        apiKeySet={Boolean(process.env.OPENROUTER_API_KEY)}
        profiles={profiles}
        workspaces={workspaces}
      />
    </div>
  );
}
