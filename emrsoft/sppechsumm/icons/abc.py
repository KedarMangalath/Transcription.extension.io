import os
import streamlit as st
import google.generativeai as genai
import pathlib
import json
from audio_recorder_streamlit import audio_recorder

# Set the API key
GEMINI_API_KEY = "AIzaSyAkwoRB7XU1mmqNftxPx7b9_Zz4wPoiXjQ"
genai.configure(api_key=GEMINI_API_KEY)

# Streamlit app
st.title("Medical EMR Assistant")

# Option to upload or record audio
option = st.radio("Choose an option:", ("Upload Audio", "Record Audio"))

audio_data = None
if option == "Upload Audio":
    uploaded_file = st.file_uploader("Upload an audio file", type=["mp3", "wav"])
    if uploaded_file is not None:
        audio_data = uploaded_file
elif option == "Record Audio":
    st.write("Click the microphone to start recording:")
    audio_bytes = audio_recorder()
    if audio_bytes:
        temp_file = pathlib.Path("temp_audio_file.wav")
        with open(temp_file, "wb") as fp:
            fp.write(audio_bytes)
        st.audio(audio_bytes, format="audio/wav")
        audio_data = temp_file

if audio_data is not None:
    st.audio(audio_data, format="audio/wav")

    if st.button("Process Audio"):
        with st.spinner("Processing audio..."):
            try:
                # Determine the MIME type
                mime_type = "audio/mpeg" if (option == "Upload Audio" and 
                          uploaded_file.name.endswith(".mp3")) else "audio/wav"

                # Upload to Gemini
                myfile = genai.upload_file(audio_data, mime_type=mime_type)

                # Configure model
                model = genai.GenerativeModel("gemini-1.5-flash",
                                           generation_config=genai.types.GenerationConfig(
                                               temperature=0
                                           ))

                # Transcribe audio
                transcription_result = model.generate_content([myfile, "Transcribe this audio file."])
                transcription_text = transcription_result.text

                # Extract medical information prompt
                extraction_prompt = """
                Analyze the following medical transcription and provide a structured medical assessment.
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
                        "likely_condition": "state 'unknown' or give the doctor's diagnosis",
                        "other_possibilities": "Give a predcition of other possible conditions",
                        "reasoning": "supporting factors for the diagnosis",
                        "suggested_tests": "recommended tests for confirmation"
                    }
                }"""

                # Extract medical information
                extraction_result = model.generate_content([
                    f"Text to analyze: {transcription_text}\n\n{extraction_prompt}"
                ])
                
                # Parse JSON response
                response_text = extraction_result.text.strip()
                response_text = response_text.replace("```json", "").replace("```", "").strip()
                
                try:
                    medical_info = json.loads(response_text)
                    # Display results
                    st.subheader("Transcription:")
                    st.write(transcription_text)

                    st.subheader("Medical Information:")
                    st.json(medical_info)

                    # Download option
                    if st.button("Download Medical Record"):
                        st.download_button(
                            label="Download JSON",
                            data=json.dumps(medical_info, indent=2),
                            file_name="medical_record.json",
                            mime="application/json"
                        )
                except json.JSONDecodeError:
                    st.error("Failed to parse JSON response")
                    st.code(response_text)

            except Exception as e:
                st.error(f"An error occurred: {str(e)}")

        # Clean up temporary file
        if option == "Record Audio" and isinstance(audio_data, pathlib.Path):
            audio_data.unlink()