"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MODULES } from "@/lib/ai/modules";
import { BANNED_RULES, REPLACEMENT_VOCABULARY } from "@/lib/compliance/checker";
import type { UserProfile, Workspace } from "@/types/database";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Manage users, workspaces, API keys, prompt library; view all client reports.",
  analyst: "Upload sources, run analysis, generate reports, edit company profiles.",
  writer: "Generate PR/IR content, edit outputs, use report builder. No system settings.",
  viewer: "View dashboards and generated reports only.",
};

export function SettingsTabs({
  modelEnv,
  apiKeySet,
  profiles,
  workspaces,
}: {
  modelEnv: { purpose: string; envVar: string; value: string }[];
  apiKeySet: boolean;
  profiles: UserProfile[];
  workspaces: Workspace[];
}) {
  return (
    <Tabs defaultValue="openrouter">
      <TabsList className="flex-wrap">
        <TabsTrigger value="openrouter">OpenRouter API</TabsTrigger>
        <TabsTrigger value="routing">Model Routing</TabsTrigger>
        <TabsTrigger value="prompts">Prompt Library</TabsTrigger>
        <TabsTrigger value="roles">User Roles</TabsTrigger>
        <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
        <TabsTrigger value="compliance">Compliance Rules</TabsTrigger>
      </TabsList>

      <TabsContent value="openrouter">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">OpenRouter API</CardTitle>
            <CardDescription>
              The API key lives only in server environment variables and is
              never sent to the browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">OPENROUTER_API_KEY:</span>
              {apiKeySet ? (
                <Badge variant="success">configured</Badge>
              ) : (
                <Badge variant="danger">not set</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              To change the key, edit <code>.env.local</code> and restart the
              dev server. All AI calls run through the server-side route{" "}
              <code>/api/ai/analyze</code>.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="routing">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model routing</CardTitle>
            <CardDescription>
              Each analysis type is mapped to a purpose; each purpose resolves
              to a model via environment variables.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Environment variable</TableHead>
                  <TableHead>Active model</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelEnv.map((row) => (
                  <TableRow key={row.purpose}>
                    <TableCell className="font-medium">{row.purpose}</TableCell>
                    <TableCell>
                      <code className="text-xs">{row.envVar}</code>
                    </TableCell>
                    <TableCell>{row.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="prompts">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prompt Library</CardTitle>
            <CardDescription>
              Templates ship in code (lib/prompts/templates.ts) and are seeded
              into the prompt_templates table for future DB-driven editing.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Analysis type</TableHead>
                  <TableHead>Workspace</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(MODULES).map((m) => (
                  <TableRow key={m.analysisType}>
                    <TableCell className="font-medium">{m.title}</TableCell>
                    <TableCell>
                      <code className="text-xs">{m.analysisType}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.workspaceType === "client_ir_pr" ? "info" : "ai"}>
                        {m.workspaceType === "client_ir_pr" ? "Client IR/PR" : "Private Market"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="roles">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Role definitions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
                    <TableRow key={role}>
                      <TableCell>
                        <Badge variant="info">{role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team members</CardTitle>
              <CardDescription>
                Admins can change roles directly in the users_profile table
                (Supabase dashboard) for MVP.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {profiles.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">
                  No profiles visible (requires admin role or Supabase setup).
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.full_name ?? p.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="info">{p.role}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="workspaces">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspaces</CardTitle>
            <CardDescription>
              The Private Market workspace defaults to private_only and is
              visible to its owner alone — enforced by row level security.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {workspaces.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                No workspaces found. Run the seed SQL in supabase/seed.sql.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Visibility</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workspaces.map((ws) => (
                    <TableRow key={ws.id}>
                      <TableCell className="font-medium">{ws.workspace_name}</TableCell>
                      <TableCell>{ws.workspace_type.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        <Badge variant={ws.visibility === "private_only" ? "ai" : "info"}>
                          {ws.visibility}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="compliance">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Banned phrases (client workspace)</CardTitle>
              <CardDescription>
                Enforced by the rule-based scanner on every client-facing AI
                output, plus available as a manual checker.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banned phrase</TableHead>
                    <TableHead>Replacement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {BANNED_RULES.map((rule) => (
                    <TableRow key={rule.phrase}>
                      <TableCell className="font-medium text-red-700">{rule.phrase}</TableCell>
                      <TableCell>{rule.suggestion}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approved replacement vocabulary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {REPLACEMENT_VOCABULARY.map((v) => (
                <Badge key={v} variant="success">{v}</Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
