import asyncio
import os
import json
import html
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, MenuButtonWebApp
from telegram.constants import ParseMode
from telegram.ext import Application, CommandHandler, ContextTypes
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# FastAPI Setup
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    return {"status": "online", "message": "ITI TO Quiz Bot & API Running"}

@app.get("/api/hello")
async def hello():
    return {"message": "Telegram Quiz Backend Running"}

# --- NEW: API Endpoint to serve Quiz Data ---
@app.get("/api/quiz/{topic_id}", responses={
    400: {"description": "Invalid topic ID format"},
    404: {"description": "Topic not found"}
})
async def get_quiz_data(topic_id: str):
    """
    Fetches quiz data for a given topic_id.
    Assumes data files are in a 'data' directory inside the 'backend' directory.
    e.g., /backend/data/os.json, /backend/data/dbms.json
    """
    # Sanitize topic_id to prevent directory traversal attacks (e.g., ../../etc/passwd)
    if ".." in topic_id or "/" in topic_id or "\\" in topic_id:
        raise HTTPException(status_code=400, detail="Invalid topic ID format.")

    # Build a safe path to the data file relative to this script
    script_dir = os.path.dirname(__file__)
    file_path = os.path.join(script_dir, "data", f"{topic_id}.json")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found.")

    # Use run_in_executor to prevent blocking the async event loop with file I/O
    loop = asyncio.get_running_loop()
    def read_json_file():
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
            
    data = await loop.run_in_executor(None, read_json_file)
    return data


# Telegram Bot Logic
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8643153333:AAFg_8qyYAFAwfQuNIe8vXYgZcqTDqxTC7w")
# Get WEBAPP_URL from environment variables. Telegram requires HTTPS.
WEBAPP_URL = os.getenv("WEBAPP_URL", "http://localhost:5173")

# Ensure URL has protocol (Telegram requires HTTPS for external URLs)
if not WEBAPP_URL.startswith("http"):
    WEBAPP_URL = f"https://{WEBAPP_URL}"

# Global bot application reference to prevent garbage collection
bot_app = None

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handles the /start command."""
    # Set the persistent Menu Button (appears next to the text input)
    try:
        await context.bot.set_chat_menu_button(
            chat_id=update.effective_chat.id,
            menu_button=MenuButtonWebApp(text="🚀 Open Quiz", web_app=WebAppInfo(url=WEBAPP_URL))
        )
    except Exception as e:
        print(f"Warning: Could not set menu button: {e}")

    keyboard = [
        [InlineKeyboardButton("🚀 Open Premium Quiz", web_app=WebAppInfo(url=WEBAPP_URL))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    user_name = update.effective_user.first_name
    # Escape the name to prevent HTML parsing errors
    safe_name = html.escape(user_name)
    
    await update.message.reply_text(
        f"🌟 <b>Namaste {safe_name}!</b>\n\n"
        f"Welcome to the <b>@itiquizmpbot Premium Quiz Experience</b>.\n\n"
        f"I have been upgraded with a high-end interface, haptic feedback, and advanced training tools to help you succeed in your ITI TO exams.\n\n"
        f"👉 <b>Click the button below to start your journey!</b>",
        reply_markup=reply_markup,
        parse_mode=ParseMode.HTML
    )

async def run_bot():
    global bot_app
    """Initializes and starts the Telegram bot polling."""
    if not TOKEN or ":" not in TOKEN:
        print("Warning: Valid TELEGRAM_BOT_TOKEN not found in .env. Bot features disabled.")
        return
    
    try:
        print(f"Bot configured with Web App URL: {WEBAPP_URL}")
        if "localhost" in WEBAPP_URL or "127.0.0.1" in WEBAPP_URL:
            print("⚠️ WARNING: Telegram Web Apps require HTTPS. 'localhost' will NOT work on mobile/desktop Telegram clients. Use ngrok.")
        elif not WEBAPP_URL.startswith("https"):
            print("⚠️ WARNING: Telegram Web Apps require HTTPS. Your URL is using HTTP, which might fail on some devices.")
            
        bot_app = Application.builder().token(TOKEN).build()
        bot_app.add_handler(CommandHandler("start", start))
        
        await bot_app.initialize()
        await bot_app.start()
        await bot_app.updater.start_polling()
        print("Bot server is now polling for @itiquizmpbot...")
    except Exception as e:
        print(f"Bot failed to start: {e}")

# Keep a strong reference to background tasks to prevent garbage collection
background_tasks = set()

@app.on_event("startup")
async def startup_event():
    """Starts the bot in the background when FastAPI starts."""
    task = asyncio.create_task(run_bot())
    background_tasks.add(task)
    task.add_done_callback(background_tasks.discard)

@app.on_event("shutdown")
async def shutdown_event():
    """Stops the bot gracefully when FastAPI shuts down."""
    if bot_app:
        await bot_app.updater.stop()
        await bot_app.stop()
        await bot_app.shutdown()

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI Server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
