import os
import json
import logging
from datetime import datetime, timezone
from firebase_functions import https_fn, options
import firebase_admin
from firebase_admin import auth, firestore
from smolagents import CodeAgent, tool
from google import genai
import requests
from bs4 import BeautifulSoup

if not firebase_admin._apps:
    firebase_admin.initialize_app()

db_client = firestore.client()
logger = logging.getLogger("gta_agent_pipeline")

@tool
def fetch_gta_web_data(query: str) -> str:
    """Scrapes content records via serverless-safe text search structures without using heavy UI browser packages.

    Args:
        query: News search terms regarding GTA 6.
    """
    try:
        search_target_url = f"https://duckduckgo.com{requests.utils.quote(query)}"
        headers_payload = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ScraperEngine"}
        response = requests.get(search_target_url, headers=headers_payload, timeout=15)
        if response.status_code != 200:
            return f"Error: Web collection failure status code {response.status_code}"
        soup = BeautifulSoup(response.text, "html.parser")
        text_snippets = [node.get_text(strip=True) for node in soup.find_all("a", class_="result__snippet")]
        return "\n\n".join(text_snippets[:4]) if text_snippets else "No news snippets matched this loop criteria."
    except Exception as e:
        return f"Scraper execution path interrupted: {str(e)}"

@tool
def save_post_to_firestore(structured_payload_json: str) -> str:
    """Parses clean summary text parameters and injects them as draft articles directly to Firestore database collection.

    Args:
        structured_payload_json: Valid JSON string matching fields: 'title', 'category', 'content'.
    """
    try:
        cleaned_json_data = json.loads(structured_payload_json)
        document_payload = {
            "title": cleaned_json_data.get("title", "Untitled GTA 6 Content Asset"),
            "category": cleaned_json_data.get("category", "News"),
            "content": cleaned_json_data.get("content", ""),
            "status": "draft",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        _, doc_ref = db_client.collection("gta_news_posts").add(document_payload)
        return f"Success: Content saved to Firestore draft with ID {doc_ref.id}"
    except Exception as e:
        return f"Error writing to Firestore: {str(e)}"

@https_fn.on_request(
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"])
)
def run_gta_agent(req: https_fn.Request) -> https_fn.Response:
    """HTTP trigger to execute the GTA 6 News smolagent."""
    if req.method == "OPTIONS":
        return https_fn.Response(status=204)
        
    try:
        # Validate admin token
        auth_header = req.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return https_fn.Response(json.dumps({"error": "Unauthorized"}), status=401, mimetype="application/json")
            
        token = auth_header.split("Bearer ")[1]
        decoded_token = auth.verify_id_token(token)
        
        if not decoded_token.get("admin", False):
            return https_fn.Response(json.dumps({"error": "Forbidden: Admin privileges required"}), status=403, mimetype="application/json")
            
        req_json = req.get_json(silent=True) or {}
        prompt = req_json.get("prompt", "Find the latest GTA 6 news and save it as a draft.")
        
        # Initialize the agent (Replace model=None with actual LLM model initialization)
        agent = CodeAgent(
            tools=[fetch_gta_web_data, save_post_to_firestore],
            model=None 
        )
        
        # Run agent
        result = agent.run(prompt)
        
        return https_fn.Response(json.dumps({
            "success": True, 
            "message": "Agent execution completed", 
            "result": str(result)
        }), status=200, mimetype="application/json")
        
    except Exception as e:
        logger.error(f"Error in run_gta_agent: {e}")
        return https_fn.Response(json.dumps({"error": str(e)}), status=500, mimetype="application/json")

