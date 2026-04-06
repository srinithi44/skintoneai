from fastapi import APIRouter, File, UploadFile, Request, Form, HTTPException
from typing import Optional
import numpy as np

# Import existing logic to fulfill all requirements
from utils.image_processing import (
    detect_and_crop_face,
    preprocess_for_model,
    classify_skin_tone,
    calculate_transformation_score
)
from routes.weather import get_weather_tips

router = APIRouter()

@router.post("")
async def full_analysis(
    request: Request,
    image: UploadFile = File(None),
    mode: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    before_image: UploadFile = File(None),
    after_image: UploadFile = File(None)
):
    response_data = {}

    # STEP 1 & 2: IMAGE INPUT & AI SKIN ANALYSIS
    if image is not None:
        if not image.content_type.startswith("image/"):
            raise HTTPException(400, "Only image files are allowed for image.")
        
        contents = await image.read()
        
        try:
            # OpenCV Face Detection - rejects if no face
            cropped = detect_and_crop_face(contents)
            
            # Predict skin tone
            model = request.app.state.model
            class_indices = request.app.state.class_indices
            
            skin_result = None
            if model is not None:
                try:
                    model_input = preprocess_for_model(cropped)
                    preds = model.predict(model_input)[0]
                    idx = int(np.argmax(preds))
                    label = class_indices.get(str(idx), "Medium")
                    skin_result = {
                        "skin_tone": label,
                        "confidence": float(preds[idx])
                    }
                except Exception:
                    pass
            
            if skin_result is None:
                skin_result = classify_skin_tone(cropped)
                skin_result = {
                    "skin_tone": skin_result.get("skin_tone", "Medium"),
                    "confidence": skin_result.get("confidence", 0.85)
                }
            
            response_data["skin_tone"] = skin_result["skin_tone"]
            response_data["confidence"] = skin_result["confidence"]
        
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    # Generate unified fake defaults if we don't have enough data
    st = response_data.get("skin_tone", "Medium")

    # STEP 3 & 4: MODE AND MAKEUP DETAILS
    rec_row = None
    if mode:
        response_data["mode"] = mode
        
        df = request.app.state.df
        if df is not None:
            # Mask by skin tone and mode
            mask = (df["skin_tone"].str.lower() == st.lower()) & (df["mode"].str.lower() == mode.lower())
            filtered = df[mask]
            if filtered.empty:
                # fallback to just skin tone
                mask = (df["skin_tone"].str.lower() == st.lower())
                filtered = df[mask]
            
            if not filtered.empty:
                # Use iloc[0] so that Step 4 and Step 5 get the EXACT same static row when re-polling!
                rec_row = filtered.iloc[0]
                
        if rec_row is not None:
            # Use dynamic data from cleaned_data.csv!
            makeup = {
                "foundation": f"Apply {rec_row.get('foundation_layer', 1)} layers (~{rec_row.get('foundation_ml', 1.0)} ml) of {rec_row.get('foundation', 'standard')} foundation",
                "lipstick": f"{rec_row.get('lipstick_layer', 1)} layer of {rec_row.get('lipstick', 'nude')} lipstick",
                "blush": f"{rec_row.get('blush_layers', 1)} layers of {rec_row.get('blush', 'soft')} blush",
                "mascara": f"{rec_row.get('mascara_layer', 1)} coats of {rec_row.get('mascara_shade', 'black')} mascara",
                "concealer": f"{rec_row.get('concealer_layer', 1)} layer of {rec_row.get('concealer', 'natural')} concealer"
            }
        else:
            # Base recommendations depending on skin tone
            makeup = {
                "foundation": f"2 layers of {st.lower()} matching liquid foundation",
                "lipstick": "1 layer of bold ruby lipstick",
                "blush": "subtle peach cream blush",
                "mascara": "waterproof carbon black mascara",
                "concealer": "light dabs under eye and T-zone"
            }
            if mode.lower() == "simple":
                makeup["foundation"] = f"1 layer of light {st.lower()} BB cream"
                makeup["lipstick"] = "1 layer of nude lip gloss"
                makeup["mascara"] = "1 coat of volumizing mascara"
            elif mode.lower() == "occasion":
                makeup["foundation"] = f"3 layers of matte {st.lower()} foundation"
                makeup["lipstick"] = "2 layers of deep matte crimson lipstick"
                makeup["mascara"] = "3 coats of dramatic false-lash effect mascara"
            
        weather_info = None
        if mode.lower() == "weather":
            if city:
                try:
                    # Leverage existing weather router code
                    weather_info = await get_weather_tips(city)
                    w_temp = weather_info.get("temperature", 25)
                    w_cond = weather_info.get("condition", "Clear").lower()
                    
                    if w_temp > 30 or "sun" in w_cond:
                        weather_info["tip"] = "Use matte and sweat-proof products."
                        makeup["foundation"] = f"2 thin layers of matte {st.lower()} foundation"
                    elif w_temp < 15 or "snow" in w_cond:
                        weather_info["tip"] = "Use hydrating and moisturizing makeup."
                        makeup["foundation"] = f"2 layers of hydrating {st.lower()} cream foundation"
                    elif "rain" in w_cond or weather_info.get("humidity", 50) > 75:
                        weather_info["tip"] = "Use waterproof makeup."
                        makeup["mascara"] = "Waterproof mascara and setting spray essential."
                        
                    response_data["weather"] = {
                        "temp": w_temp,
                        "humidity": weather_info.get("humidity", 50),
                        "tip": weather_info.get("tip", "Standard everyday look applies.")
                    }
                except Exception:
                    pass
                    
        response_data["makeup_details"] = makeup

    # STEP 5: TRANSFORMATION
    if before_image is not None and after_image is not None:
        b_chars = await before_image.read()
        a_chars = await after_image.read()
        try:
            trans_result = calculate_transformation_score(b_chars, a_chars)
            # Add dataset metrics using the same row cached from mode filtering above
            score = trans_result.get("transformation_percentage", 65.0)
            
            if rec_row is not None:
                risk = str(rec_row.get("risk_level", "Low")).title()
                longevity = str(rec_row.get("longevity", "10 hrs"))
                cost = int(rec_row.get("cost_of_makeup", 1500))
            else:
                if score > 70:
                    risk = "Low"
                    longevity = "16 hrs"
                    cost = 2500
                elif score > 40:
                    risk = "Medium"
                    longevity = "10 hrs"
                    cost = 1800
                else:
                    risk = "High"
                    longevity = "6 hrs"
                    cost = 800
            
            response_data["transformation"] = {
                "score": score,
                "risk": risk,
                "cost": cost,
                "longevity": longevity,
                "feedback": trans_result.get("feedback", "Enhancement applied.")
            }
        except Exception:
            pass

    return response_data
