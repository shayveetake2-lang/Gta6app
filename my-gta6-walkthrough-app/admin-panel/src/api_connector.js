import { getAuth } from "firebase/auth";

export async function dispatchAgentHarvest(adminPromptDirective) {
  const auth = getAuth();
  const activeUser = auth.currentUser;
  if (!activeUser) return { success: false, error: "Active admin context absent." };

  try {
    const targetSessionIdToken = await activeUser.getIdToken(true);
    const liveEndpointTarget = "https://run_gta_agent-YOUR_PROJECT_ID.cloudfunctions.net/run_gta_agent";

    const response = await fetch(liveEndpointTarget, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${targetSessionIdToken}`
      },
      body: JSON.stringify({ prompt: adminPromptDirective })
    });

    const parsedPayload = await response.json();
    if (!response.ok) throw new Error(parsedPayload.error || "Server HTTP Fault.");
    return { success: true, message: parsedPayload.message };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

