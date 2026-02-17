import cv2
import numpy as np
from PIL import Image
import io

def process_image(image_bytes, algorithm, params):
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        print("Error: Could not decode image frame")
        return None

    # Grayscale conversion
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Gaussian Blur for noise reduction
    if params.get('blur', False):
        k_size = params.get('blur_kernel', 5)
        if k_size % 2 == 0: k_size += 1
        gray = cv2.GaussianBlur(gray, (k_size, k_size), 0)

    processed = None
    
    if algorithm == 'canny':
        t1 = params.get('threshold1', 100)
        t2 = params.get('threshold2', 200)
        processed = cv2.Canny(gray, t1, t2)
    
    elif algorithm == 'sobel':
        ksize = params.get('ksize', 3)
        if ksize % 2 == 0: ksize += 1
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=ksize)
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=ksize)
        processed = np.sqrt(sobelx**2 + sobely**2)
        processed = np.uint8(np.absolute(processed))
        
    elif algorithm == 'laplacian':
        ksize = params.get('ksize', 3)
        if ksize % 2 == 0: ksize += 1
        laplacian = cv2.Laplacian(gray, cv2.CV_64F, ksize=ksize)
        processed = np.uint8(np.absolute(laplacian))
    
    elif algorithm == 'scharr':
        scharrx = cv2.Scharr(gray, cv2.CV_64F, 1, 0)
        scharry = cv2.Scharr(gray, cv2.CV_64F, 0, 1)
        processed = np.sqrt(scharrx**2 + scharry**2)
        processed = np.uint8(np.absolute(processed))

    elif algorithm == 'prewitt':
        kernelx = np.array([[1,1,1],[0,0,0],[-1,-1,-1]])
        kernely = np.array([[-1,0,1],[-1,0,1],[-1,0,1]])
        prewittx = cv2.filter2D(gray, -1, kernelx)
        prewitty = cv2.filter2D(gray, -1, kernely)
        processed = prewittx + prewitty

    elif algorithm == 'morphological':
        ksize = params.get('ksize', 3)
        kernel = np.ones((ksize, ksize), np.uint8)
        processed = cv2.morphologyEx(gray, cv2.MORPH_GRADIENT, kernel)
    
    elif algorithm == 'roberts':
        kernelx = np.array([[1, 0], [0, -1]])
        kernely = np.array([[0, 1], [-1, 0]])
        robertsx = cv2.filter2D(gray, -1, kernelx)
        robertsy = cv2.filter2D(gray, -1, kernely)
        processed = np.uint8(np.absolute(robertsx) + np.absolute(robertsy))
    
    else:
        processed = gray

    if params.get('invert', False):
        processed = 255 - processed

    # Convert processed image back to bytes
    _, buffer = cv2.imencode('.png', processed)
    return buffer.tobytes()

def get_histogram(image_bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    
    hist = cv2.calcHist([img], [0], None, [256], [0, 256])
    return hist.flatten().tolist()
