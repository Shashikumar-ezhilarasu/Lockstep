import { withSupabase } from "@supabase/server"

export default {
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    // Example handler using ctx.supabase (RLS-scoped) to fetch queues
    const { data, error } = await ctx.supabase.from("queues").select()
    
    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }
    
    return Response.json({ data })
  }),
}
