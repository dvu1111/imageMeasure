# Image Measurement Tool

A powerful, React-based web application for precise image measurement, annotation, and perspective correction. Built with TypeScript and HTML5 Canvas.

## Features

*   📏 **Line Measurement:** Measure straight-line distances between two points on an image.
*   ⭕ **Radius Measurement:** Measure the radius of a circle or arc by selecting three points along its curve.
*   📐 **Perspective Correction:** Correct skewed or angled images by selecting four points (Top-Left, Top-Right, Bottom-Right, Bottom-Left) to warp the selected area into a flat rectangle.
*   🔄 **Reset to Original:** Easily revert any perspective warps back to the original uploaded image.
*   🔍 **Pan & Zoom:** Navigate large, high-resolution images smoothly using mouse drag and scroll wheel.
*   💾 **Export Capabilities:** 
    *   Export the annotated image with all measurements and visual markers as a PNG.
    *   Export the raw measurement data (lines and radii) as a CSV file for further analysis.
*   📋 **Clipboard Support:** Paste images directly from your clipboard into the application.

## Tech Stack

*   **Frontend Framework:** React 18
*   **Language:** TypeScript
*   **Rendering:** HTML5 Canvas API
*   **Build Tool:** Vite
*   **Deployment:** GitHub Pages (via GitHub Actions)

## Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd imageMeasure
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000` (or the port specified by Vite).

## How to Use

1. **Load an Image:** Click "Choose File" in the sidebar or paste an image directly from your clipboard (`Ctrl+V` or `Cmd+V`).
2. **Select a Tool:**
   *   **Line:** Click and drag on the canvas to draw a measurement line.
   *   **Radius:** Click three points on the edge of a circular object to calculate its radius.
   *   **Perspective:** Click four corners of a rectangular object in the image (Top-Left, Top-Right, Bottom-Right, Bottom-Left). Once 4 points are placed, click "Apply Warp" in the sidebar to flatten the image.
3. **Calibrate (Optional):** If you know the real-world length of a specific measurement, you can apply a scale to convert pixel distances to real-world units.
4. **Export:** Use the "Export PNG" or "Export CSV" buttons in the sidebar to save your work.

## Project Structure

*   `src/components/CanvasArea.tsx`: Core rendering engine handling HTML5 Canvas drawing, panning, zooming, and user interactions.
*   `src/components/Sidebar.tsx`: User interface for tool selection, image loading, and exporting.
*   `src/store.ts`: Centralized state management for the application (viewport, lines, image data, perspective points).
*   `src/utils/math.ts`: Mathematical utility functions for distance calculation, circle fitting, and homography (perspective warping) matrices.
*   `src/types.ts`: TypeScript interfaces and types used across the application.
*   `.github/workflows/deploy.yml`: CI/CD pipeline for automated deployment to GitHub Pages.

## License

MIT License
