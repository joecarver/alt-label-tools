import os
from twocaptcha import TwoCaptcha
import logging

def init_2captcha() -> TwoCaptcha:
    try:    
        twocaptcha_key = os.getenv("TWOCAPTCHA_API_KEY", "").strip()

        solver = TwoCaptcha(twocaptcha_key)
        _ = solver.balance()  # verify API/key
        logging.info("[2Captcha] API reachable; balance checked")
        return solver
    except Exception as e:
        raise SystemExit(f"2Captcha initialization failed: {e}")

