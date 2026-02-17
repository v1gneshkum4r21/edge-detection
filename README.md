# EdgeVision Pro 👁️

EdgeVision Pro is a high-performance, interactive Edge Detection Visualizer. It provides a real-time playground for exploring digital image processing algorithms using **Python (OpenCV/FastAPI)** and **React**.

---

## 🔬 Algorithm Deep Dive

### 1. Canny Edge Detection
The Canny algorithm is a multi-stage process widely considered the "Gold Standard" of edge detection.

**The Process:**
1.  **Noise Reduction**: Applies a Gaussian filter to smooth the image.
2.  **Gradient Calculation**: Finds the intensity gradients of the image using Sobel-like kernels.
3.  **Non-Maximum Suppression**: Thins the edges by suppressing pixels that are not at the local maximum of the gradient direction.
4.  **Hysteresis Thresholding**: Uses two thresholds ($T1$ and $T2$). Pixels with gradient $> T2$ are strong edges. Pixels between $T1$ and $T2$ are only kept if they connect to strong edges.

---

### 2. Sobel Operator
The Sobel operator performs a 2-D spatial gradient measurement on an image. It highlights regions of high spatial frequency that correspond to edges.

**Mathematical Kernels:**

$$
G_x = \begin{bmatrix} -1 & 0 & +1 \\ -2 & 0 & +2 \\ -1 & 0 & +1 \end{bmatrix} * I, \quad G_y = \begin{bmatrix} -1 & -2 & -1 \\ 0 & 0 & 0 \\ +1 & +2 & +1 \end{bmatrix} * I
$$

The gradient magnitude is calculated as:
$$G = \sqrt{G_x^2 + G_y^2}$$

---

### 3. Laplacian Operator
The Laplacian is a 2nd-order derivative operator. Unlike Sobel, it is isotropic (rotationally invariant) and detects edges by finding zero-crossings in the second derivative.

**Mathematics:**
It approximates the Laplacian of an image $L(x,y)$:

$$
\nabla^2 f = \frac{\partial^2 f}{\partial x^2} + \frac{\partial^2 f}{\partial y^2}
$$

Approximation kernel ($3 \times 3$):
$$
K = \begin{bmatrix} 0 & 1 & 0 \\ 1 & -4 & 1 \\ 0 & 1 & 0 \end{bmatrix}
$$

---

### 4. Scharr Operator
Scharr is an optimization of the Sobel operator. It was designed to provide better rotation invariance, especially for $3 \times 3$ filters.

**Mathematical Kernels:**

$$
G_x = \begin{bmatrix} -3 & 0 & +3 \\ -10 & 0 & +10 \\ -3 & 0 & +3 \end{bmatrix}, \quad G_y = \begin{bmatrix} -3 & -10 & -3 \\ 0 & 0 & 0 \\ +3 & +10 & +3 \end{bmatrix}
$$

---

### 5. Prewitt Operator
Similar to Sobel, the Prewitt operator is used for detecting edges in two directions. It uses a simpler weight distribution.

**Mathematical Kernels:**

$$
G_x = \begin{bmatrix} -1 & 0 & +1 \\ -1 & 0 & +1 \\ -1 & 0 & +1 \end{bmatrix}, \quad G_y = \begin{bmatrix} -1 & -1 & -1 \\ 0 & 0 & 0 \\ +1 & +1 & +1 \end{bmatrix}
$$

---

### 6. Roberts Operator
The Roberts Cross operator is one of the earliest and simplest edge detectors. It uses a $2 \times 2$ matrix to compute the gradient.

**Mathematical Kernels:**

$$
G_x = \begin{bmatrix} +1 & 0 \\ 0 & -1 \end{bmatrix}, \quad G_y = \begin{bmatrix} 0 & +1 \\ -1 & 0 \end{bmatrix}
$$

---

### 7. Morphological Gradient
Unlike derivative-based methods, this uses **Set Theory**.

**The Process:**
The gradient is the difference between the **Dilation** and **Erosion** of the image:

$$
G(f) = (f \oplus B) - (f \ominus B)
$$

Where $B$ is the structuring element (Kernel).

---

## 🛠️ Implementation Techniques

### Noise Reduction (Gaussian Blur)
Before detection, we apply a Gaussian blur to reduce noise.
**Equation**: 
$$G(x,y) = \frac{1}{2\pi\sigma^2} e^{-\frac{x^2+y^2}{2\sigma^2}}$$

### Intensity Histogram
The app generates a 256-bin histogram of the original image.
- **X-Axis**: Pixel Intensity (0-255)
- **Y-Axis**: Frequency of pixels

---

## 🚀 Setup & Running

1. **Backend**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python main.py
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 🎨 Architecture
- **FastAPI**: Handles multipart image uploads and returns processed PNG streams.
- **OpenCV (cv2)**: Executes mathematical convolutions and morphological operations.
- **React (Vite)**: Manages state for real-time parameter tuning and side-by-side rendering.
- **Framer Motion**: Smooth entry and transition animations for UI cards.
