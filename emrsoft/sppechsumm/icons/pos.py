import streamlit as st
import google.generativeai as genai
import base64
import fitz  # PyMuPDF
from PIL import Image
import io

# Configure Gemini API
GEMINI_API_KEY = "AIzaSyAkwoRB7XU1mmqNftxPx7b9_Zz4wPoiXjQ"
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel(model_name="gemini-1.5-pro")

def extract_text_and_images_from_pdf(pdf_file):
    """Extract text and images from PDF file"""
    pdf_document = fitz.open(stream=pdf_file.read(), filetype="pdf")
    text_content = ""
    images = []
    
    for page_num in range(pdf_document.page_count):
        page = pdf_document[page_num]
        text_content += page.get_text()
        
        image_list = page.get_images()
        for img_index, img in enumerate(image_list):
            xref = img[0]
            base_image = pdf_document.extract_image(xref)
            image_bytes = base_image["image"]
            
            # Convert to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            images.append(image)
    
    return text_content, images

def process_content(text_content, images, prompt):
    """Process text and images with Gemini"""
    # Combine text and images into a single knowledge base
    knowledge_base = f"Text Content:\n{text_content}\n\nImages:"
    
    # Prepare image parts for the API
    image_parts = []
    for idx, image in enumerate(images):
        if isinstance(image, Image.Image):
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='PNG')
            img_byte_arr = img_byte_arr.getvalue()
        else:
            img_byte_arr = image
        
        # Encode image in Base64
        encoded_image = base64.b64encode(img_byte_arr).decode('utf-8')
        image_parts.append({
            'mime_type': 'image/png',
            'data': encoded_image
        })
    
    # Prepare the input for the API
    input_parts = [{'text': knowledge_base}]
    input_parts.extend(image_parts)
    
    # Generate response
    response = model.generate_content(input_parts)
    
    return response.text

def main():
    st.title("Mathematical PDF Chat Interface with Gemini Pro Vision")
    
    # File upload
    uploaded_file = st.file_uploader("Upload a PDF containing mathematical knowledge", type=['pdf'])
    
    if uploaded_file is not None:
        # Initialize chat history
        if "chat_history" not in st.session_state:
            st.session_state.chat_history = []
        
        # Display chat history
        for message in st.session_state.chat_history:
            st.write(f"{message['role']}: {message['content']}")
        
        # Text input for user question
        user_question = st.text_input("Ask a question about the PDF content:")
        
        if st.button("Send"):
            with st.spinner("Processing..."):
                if uploaded_file.type == "application/pdf":
                    # Handle PDF
                    text_content, images = extract_text_and_images_from_pdf(uploaded_file)
                    
                    if not text_content and not images:
                        st.warning("No content found in the PDF.")
                    else:
                        # Add user question to chat history
                        st.session_state.chat_history.append({"role": "user", "content": user_question})
                        
                        # Construct prompt for analysis
                        prompt = f"The following content is extracted from a PDF. {user_question}"
                        response = process_content(text_content, images, prompt)
                        
                        # Add Gemini response to chat history
                        st.session_state.chat_history.append({"role": "Gemini", "content": response})
                        
                        st.write("Analysis:", response)
                        st.divider()
                
                else:
                    st.warning("Please upload a PDF file.")

if __name__ == "__main__":
    main()