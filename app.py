import os
from flask import Flask, render_template, request, jsonify
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Azure AI setup
endpoint = "https://models.github.ai/inference"
model = "openai/gpt-4o"
token = os.environ["GITHUB_TOKEN"]

client = ChatCompletionsClient(
    endpoint=endpoint,
    credential=AzureKeyCredential(token),
)

# Store conversation history
conversation_history = []

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "")

    if not user_message.strip():
        return jsonify({"error": "Empty message"}), 400

    # Add user message to history
    conversation_history.append(UserMessage(user_message))

    try:
        response = client.complete(
            messages=[
                SystemMessage("You are a helpful, friendly AI assistant. Provide clear, concise answers. Use markdown formatting when appropriate."),
                *conversation_history
            ],
            model=model
        )

        assistant_reply = response.choices[0].message.content

        # Add assistant reply to history (as a UserMessage workaround for context)
        from azure.ai.inference.models import AssistantMessage
        conversation_history.append(AssistantMessage(assistant_reply))

        return jsonify({"reply": assistant_reply})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/clear", methods=["POST"])
def clear():
    global conversation_history
    conversation_history = []
    return jsonify({"status": "cleared"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
