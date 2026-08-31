import firebase_admin
from firebase_admin import auth

if not firebase_admin._apps:
    firebase_admin.initialize_app()

def elevate_to_admin(email_address):
    try:
        user = auth.get_user_by_email(email_address)
        auth.set_custom_user_claims(user.uid, {'admin': True})
        print(f"🚀 [SUCCESS] Administrative privileges allocated to: {email_address}")
    except Exception as e:
        print(f"❌ [CRITICAL ERROR] Failed to adjust profile claims: {e}")

if __name__ == "__main__":
    elevate_to_admin("admin@yourgta6app.com") # Note: Add this file to your project .gitignore

