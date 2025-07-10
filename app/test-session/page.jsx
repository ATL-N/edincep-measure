// app/test-session/page.js
import { getCurrentUser } from "@/lib/session";

export default async function TestSession() {
  const user = await getCurrentUser();

  return (
    <div>
      <h1>Session Test</h1>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </div>
  );
}
