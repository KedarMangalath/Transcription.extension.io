from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from .models import History
import google.generativeai as genai
import tempfile
import os
import json
import uuid
from datetime import datetime
from dotenv import load_dotenv



load_dotenv() 
gemini_api_key=os.getenv("GEMINI_API_KEY")

genai.configure(api_key=gemini_api_key)

@csrf_exempt
def process_audio(request):
    if request.method == 'POST':
        temp_file_path = None
        try:
            if 'audio' not in request.FILES:
                return JsonResponse({'error': 'No audio file provided'}, status=400)

            audio_file = request.FILES['audio']
            secure_name = audio_file.name

            # Save the audio file to a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
                temp_file_path = temp_file.name
                for chunk in audio_file.chunks():
                    temp_file.write(chunk)

            # Upload to Gemini
            myfile = genai.upload_file(temp_file_path, mime_type="audio/wav")

            # Process with Gemini
            model = genai.GenerativeModel("gemini-1.5-flash")

            # First get transcription
            transcription_result = model.generate_content([myfile, "Transcribe this audio file."])
            transcription_text = transcription_result.text

            # Extract medical information prompt
            extraction_prompt = """
            Analyze the following medical transcription and provide a structured medical assessment. Always Give unclear if not enough information is provided.
            Return ONLY a JSON object in this format:

            {
                "patient_symptoms": {
                    "main_complaint": "primary symptom",
                    "other_symptoms": "additional symptoms",
                    "duration": "time period"
                },
                "medical_history": {
                    "allergies": "any allergies mentioned",
                    "conditions": "past medical conditions",
                    "medications": "current medications"
                },
                "current_assessment": {
                    "symptoms_detail": "detailed symptom description",
                    "severity": "mild/moderate/severe",
                    "triggers": "aggravating factors"
                },
                "diagnosis": {
                    "likely_condition": "probable diagnosis",
                    "other_possibilities": "differential diagnoses",
                    "reasoning": "supporting factors",
                    "suggested_tests": "recommended tests"
                }
            }
            """

            # Extract medical information
            extraction_result = model.generate_content([
                f"Text to analyze: {transcription_text}\n\n{extraction_prompt}"
            ])

            # Parse JSON response
            response_text = extraction_result.text.strip()
            response_text = response_text.replace("```json", "").replace("```", "").strip()
            medical_info = json.loads(response_text)

            # Save to history
            user_id = "user_123"  # Replace with actual user ID (e.g., from authentication)
            audio_filename = save_audio_file(audio_file.read())
            History.objects.create(
                user_id=user_id,
                audio_name=secure_name,
                transcription=transcription_text,
                extracted_content=medical_info,
                audio_filename=audio_filename
            )

            return JsonResponse(medical_info)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

        finally:
            # Ensure the temporary file is deleted
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except Exception as e:
                    print(f"Failed to delete temp file: {str(e)}")

    return JsonResponse({'error': 'Invalid request method'}, status=400)

def save_audio_file(audio_blob):
    """Save the audio file to the 'media' directory and return the filename."""
    if not os.path.exists('media/audio'):
        os.makedirs('media/audio')

    filename = f"{uuid.uuid4().hex}.wav"
    filepath = os.path.join('media/audio', filename)

    with open(filepath, 'wb') as f:
        f.write(audio_blob)

    return filename

@csrf_exempt
def get_user_history(request):
    if request.method == 'GET':
        user_id = "user_123"  # Replace with actual user ID (e.g., from authentication)
        history = History.objects.filter(user_id=user_id).order_by('-timestamp')
        history_data = []

        for entry in history:
            history_data.append({
                'id': entry.id,
                'audio_name': entry.audio_name,
                'transcription': entry.transcription,
                'extracted_content': entry.extracted_content,
                'audio_url': f"http://localhost:8000/media/audio/{entry.audio_filename}",
                'timestamp': entry.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            })

        return JsonResponse(history_data, safe=False)

    return JsonResponse({'error': 'Invalid request method'}, status=400)
def dashboard(request):
    # Fetch history for the current user (replace 'user_123' with the actual user ID)
    user_id = "user_123"  # You can get this from the request if you have authentication
    history = History.objects.filter(user_id=user_id).order_by('-timestamp')
    
    # Pass the history data to the template
    return render(request, 'emr_app/dashboard.html', {'history': history})