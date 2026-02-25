import asyncio
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
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

# Telegram Bot Logic
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
# For local testing, you should use a tool like ngrok or serve the local URL
# For now, I'll set it to a placeholder that reflects it should be your frontend URL
WEBAPP_URL = "http://localhost:5173" 

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handles the /start command."""
    keyboard = [
        [InlineKeyboardButton("🚀 Open Premium Quiz", web_app=WebAppInfo(url=WEBAPP_URL))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    user_name = update.effective_user.first_name
    await update.message.reply_text(
        f"🌟 **Namaste {user_name}!**\n\n"
        f"Welcome to the **@itiquizmpbot Premium Quiz Experience**.\n\n"
        f"I have been upgraded with a high-end interface, haptic feedback, and advanced training tools to help you succeed in your ITI TO exams.\n\n"
        f"👉 **Click the button below to start your journey!**",
        reply_markup=reply_markup,
        parse_mode="Markdown"
    )

async def run_bot():
    """Initializes and starts the Telegram bot polling."""
    if not TOKEN or ":" not in TOKEN:
        print("Warning: Valid TELEGRAM_BOT_TOKEN not found in .env. Bot features disabled.")
        return
    
    try:
        application = Application.builder().token(TOKEN).build()
        application.add_handler(CommandHandler("start", start))
        
        await application.initialize()
        await application.start()
        await application.updater.start_polling()
        print(f"Bot server is now polling for @itiquizmpbot...")
    except Exception as e:
        print(f"Bot failed to start: {e}")

@app.on_event("startup")
async def startup_event():
    """Starts the bot in the background when FastAPI starts."""
    asyncio.create_task(run_bot())

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI Server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
