"""
utils/demo_images.py — Demo Visualization Generator
=====================================================
Generates realistic-looking explainability images from any input image
when running in demo mode (no trained checkpoint).

Produces:
    - Grad-CAM overlay       (jet colormap heatmap focused on DR-relevant regions)
    - Attention map          (plasma colormap grid attention from ViT patches)
    - Explanation panel      (combined 2x2 panel)
    - Vessel segmentation    (green overlay on vessel-like structures)
    - Optic disc mask        (yellow circle in temporal region)
"""

from __future__ import annotations
import io
import base64
import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageFont
from typing import Optional, Tuple


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _to_b64(img: np.ndarray) -> str:
    if img.dtype != np.uint8:
        img = np.clip(img * 255, 0, 255).astype(np.uint8)
    pil = Image.fromarray(img)
    buf = io.BytesIO()
    pil.save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode()


def _load_rgb(image_bytes: bytes, size: int = 512) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((size, size), Image.LANCZOS)
    return np.array(img, dtype=np.float32) / 255.0


def _apply_colormap(heatmap: np.ndarray, cmap: str = "jet") -> np.ndarray:
    """Map [0,1] grayscale → RGB colormap."""
    h = np.clip(heatmap, 0, 1)
    if cmap == "jet":
        r = np.clip(1.5 - np.abs(h * 4 - 3), 0, 1)
        g = np.clip(1.5 - np.abs(h * 4 - 2), 0, 1)
        b = np.clip(1.5 - np.abs(h * 4 - 1), 0, 1)
    elif cmap == "plasma":
        r = np.clip(0.05 + h * 0.9 + h**2 * 0.05, 0, 1)
        g = np.clip(h * 0.4, 0, 1)
        b = np.clip(0.5 - h * 0.5 + np.sin(h * np.pi) * 0.5, 0, 1)
    elif cmap == "hot":
        r = np.clip(h * 3, 0, 1)
        g = np.clip(h * 3 - 1, 0, 1)
        b = np.clip(h * 3 - 2, 0, 1)
    else:
        r = g = b = h
    return np.stack([r, g, b], axis=-1)


def _overlay(rgb: np.ndarray, colormap_rgb: np.ndarray, alpha: float = 0.5) -> np.ndarray:
    blended = (1 - alpha) * rgb + alpha * colormap_rgb
    return np.clip(blended * 255, 0, 255).astype(np.uint8)


# ─────────────────────────────────────────────────────────────────────────────
# Grad-CAM Demo Generator
# ─────────────────────────────────────────────────────────────────────────────

def generate_gradcam(image_bytes: bytes, dr_grade: int = 2, size: int = 512) -> str:
    """
    Generate a realistic-looking Grad-CAM heatmap overlay.
    Higher DR grade → more diffuse, widespread activation.
    Grade 0 → small focal activation near center.
    Grade 4 → widespread activation across whole retina.
    """
    rng = np.random.default_rng(42 + dr_grade)
    rgb = _load_rgb(image_bytes, size)

    # Base: use image brightness to guide heatmap (brighter = more likely DR)
    gray = 0.299 * rgb[:,:,0] + 0.587 * rgb[:,:,1] + 0.114 * rgb[:,:,2]

    # Generate activation blobs based on grade
    heatmap = np.zeros((size, size), dtype=np.float32)

    # Number and spread of activation centers increases with grade
    num_blobs = max(1, dr_grade * 2 + 1)
    blob_size = 60 + dr_grade * 30  # pixels

    for _ in range(num_blobs):
        # Blobs tend to be in mid-periphery for DR
        angle = rng.uniform(0, 2 * np.pi)
        radius = rng.uniform(0.1, 0.45) * size
        cx = int(size / 2 + np.cos(angle) * radius)
        cy = int(size / 2 + np.sin(angle) * radius)
        cx = np.clip(cx, 0, size - 1)
        cy = np.clip(cy, 0, size - 1)
        strength = rng.uniform(0.6, 1.0)
        bsz = int(rng.uniform(blob_size * 0.5, blob_size * 1.5))

        yy, xx = np.mgrid[0:size, 0:size]
        dist = np.sqrt((xx - cx)**2 + (yy - cy)**2)
        blob = np.exp(-dist**2 / (2 * (bsz / 2.5)**2)) * strength
        heatmap = np.maximum(heatmap, blob)

    # Add subtle image-guided noise (lesions appear brighter)
    heatmap += gray * 0.15 * (dr_grade / 4)

    # Smooth
    heatmap_pil = Image.fromarray((heatmap * 255).astype(np.uint8))
    heatmap_pil = heatmap_pil.filter(ImageFilter.GaussianBlur(radius=8))
    heatmap = np.array(heatmap_pil, dtype=np.float32) / 255.0

    # Normalize
    heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)

    colormap = _apply_colormap(heatmap, "jet")
    result = _overlay(rgb, colormap, alpha=0.55)

    # Add colorbar strip on right
    bar_width = 16
    bar = np.linspace(1, 0, size).reshape(-1, 1) * np.ones((1, bar_width))
    bar_rgb = (_apply_colormap(bar, "jet") * 255).astype(np.uint8)
    canvas = np.zeros((size, size + bar_width + 4, 3), dtype=np.uint8)
    canvas[:, :size] = result
    canvas[:, size + 4:] = bar_rgb

    return _to_b64(canvas)


# ─────────────────────────────────────────────────────────────────────────────
# Attention Map Generator
# ─────────────────────────────────────────────────────────────────────────────

def generate_attention_map(image_bytes: bytes, dr_grade: int = 2, size: int = 512) -> str:
    """
    Generate ViT-style patch attention map (14×14 grid upsampled to full res).
    """
    rng = np.random.default_rng(123 + dr_grade)
    rgb = _load_rgb(image_bytes, size)

    # 14×14 patch grid (like ViT-B/16 with 224px → 14 patches per side)
    grid = 14
    attn_grid = rng.uniform(0.1, 0.4, (grid, grid)).astype(np.float32)

    # High-attention patches in periphery for DR
    center = grid // 2
    for i in range(grid):
        for j in range(grid):
            dist_from_center = np.sqrt((i - center)**2 + (j - center)**2) / center
            if dr_grade >= 2:
                # Peripheral attention for moderate+ DR
                attn_grid[i, j] += dist_from_center * 0.5 * rng.uniform(0.8, 1.2)
            else:
                # Central attention for mild/no DR
                attn_grid[i, j] += (1 - dist_from_center) * 0.3

    # Add random high-attention spots (lesion locations)
    num_spots = dr_grade * 2
    for _ in range(num_spots):
        pi = rng.integers(1, grid - 1)
        pj = rng.integers(1, grid - 1)
        attn_grid[pi, pj] = rng.uniform(0.8, 1.0)
        # Spread to neighbors
        for di in [-1, 0, 1]:
            for dj in [-1, 0, 1]:
                ni, nj = pi + di, pj + dj
                if 0 <= ni < grid and 0 <= nj < grid:
                    attn_grid[ni, nj] = max(attn_grid[ni, nj], 0.6)

    # Normalize and upsample
    attn_grid = (attn_grid - attn_grid.min()) / (attn_grid.max() - attn_grid.min() + 1e-8)
    attn_pil = Image.fromarray((attn_grid * 255).astype(np.uint8))
    attn_up = attn_pil.resize((size, size), Image.BICUBIC)
    attn_up = attn_up.filter(ImageFilter.GaussianBlur(radius=12))
    attn_np = np.array(attn_up, dtype=np.float32) / 255.0

    colormap = _apply_colormap(attn_np, "plasma")
    result = _overlay(rgb, colormap, alpha=0.6)

    # Draw patch grid overlay (subtle)
    result_pil = Image.fromarray(result)
    draw = ImageDraw.Draw(result_pil)
    patch_size = size // grid
    for i in range(grid + 1):
        y = i * patch_size
        draw.line([(0, y), (size, y)], fill=(255, 255, 255, 30), width=1)
    for j in range(grid + 1):
        x = j * patch_size
        draw.line([(x, 0), (x, size)], fill=(255, 255, 255, 30), width=1)

    return _to_b64(np.array(result_pil))


# ─────────────────────────────────────────────────────────────────────────────
# Vessel Segmentation Generator
# ─────────────────────────────────────────────────────────────────────────────

def generate_vessel_mask(image_bytes: bytes, size: int = 512) -> str:
    """
    Generate retinal vessel segmentation using image processing.
    Uses green channel enhancement (vessels appear dark in green channel).
    """
    rgb = _load_rgb(image_bytes, size)

    # Green channel has best vessel contrast in fundus images
    green = rgb[:, :, 1]

    # CLAHE-like enhancement via PIL
    g_pil = Image.fromarray((green * 255).astype(np.uint8))
    g_pil = g_pil.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
    g_enhanced = np.array(g_pil, dtype=np.float32) / 255.0

    # Vessels are dark → invert and threshold
    inverted = 1.0 - g_enhanced

    # Threshold to get vessel-like mask
    threshold = np.percentile(inverted, 70)
    vessel_mask = (inverted > threshold).astype(np.float32)

    # Morphological-like cleanup via PIL
    mask_pil = Image.fromarray((vessel_mask * 255).astype(np.uint8))
    mask_pil = mask_pil.filter(ImageFilter.MinFilter(3))  # erode
    mask_pil = mask_pil.filter(ImageFilter.MaxFilter(3))  # dilate
    vessel_mask = np.array(mask_pil, dtype=np.float32) / 255.0

    # Apply retinal boundary (circular mask)
    yy, xx = np.mgrid[0:size, 0:size]
    dist = np.sqrt((xx - size/2)**2 + (yy - size/2)**2)
    retina_boundary = (dist < size * 0.47).astype(np.float32)
    vessel_mask *= retina_boundary

    # Create overlay: original + green vessel highlight
    result = (rgb * 255).astype(np.uint8).copy()
    vessel_bool = vessel_mask > 0.5
    result[vessel_bool, 0] = np.clip(result[vessel_bool, 0].astype(int) * 0.3, 0, 255).astype(np.uint8)
    result[vessel_bool, 1] = np.clip(result[vessel_bool, 1].astype(int) * 0.5 + 80, 0, 255).astype(np.uint8)
    result[vessel_bool, 2] = np.clip(result[vessel_bool, 2].astype(int) * 0.3, 0, 255).astype(np.uint8)

    return _to_b64(result)


# ─────────────────────────────────────────────────────────────────────────────
# Optic Disc Mask Generator
# ─────────────────────────────────────────────────────────────────────────────

def generate_optic_disc_mask(image_bytes: bytes, cup_disc_ratio: float = 0.45, size: int = 512) -> str:
    """
    Generate optic disc + optic cup segmentation overlay.
    Disc = yellow circle (bright region in fundus).
    Cup = red inner circle (based on CDR).
    """
    rgb = _load_rgb(image_bytes, size)
    result = (rgb * 255).astype(np.uint8).copy()

    # Find bright region (optic disc is the brightest region)
    brightness = 0.299 * rgb[:,:,0] + 0.587 * rgb[:,:,1] + 0.114 * rgb[:,:,2]

    # Find the brightest region center (disc location)
    # Smooth first to avoid noise
    bright_pil = Image.fromarray((brightness * 255).astype(np.uint8))
    bright_smooth = np.array(bright_pil.filter(ImageFilter.GaussianBlur(20)), dtype=np.float32) / 255.0

    # Disc is typically in the temporal half
    # Restrict search to right half (nasal side for OD)
    search_area = bright_smooth.copy()
    search_area[:, :size//3] *= 0.3  # reduce left side weight

    disc_y, disc_x = np.unravel_index(np.argmax(search_area), search_area.shape)

    # Disc radius (typically ~1/7 of image)
    disc_r = int(size * 0.085)
    cup_r  = int(disc_r * cup_disc_ratio)

    # Draw on PIL for clean circles
    overlay_pil = Image.fromarray(result).convert("RGBA")
    draw = ImageDraw.Draw(overlay_pil)

    # Optic disc — yellow outline + semi-transparent fill
    disc_box = [disc_x - disc_r, disc_y - disc_r, disc_x + disc_r, disc_y + disc_r]
    draw.ellipse(disc_box, outline=(255, 220, 0, 255), width=3)

    # Optic cup — red outline
    cup_box = [disc_x - cup_r, disc_y - cup_r, disc_x + cup_r, disc_y + cup_r]
    draw.ellipse(cup_box, outline=(255, 60, 60, 255), width=2)

    # CDR text
    draw.text((disc_x - 20, disc_y + disc_r + 6),
              f"CDR: {cup_disc_ratio:.2f}", fill=(255, 220, 0, 220))

    # Legend
    draw.rectangle([8, 8, 22, 22], outline=(255, 220, 0, 255), width=2)
    draw.text((26, 10), "Optic Disc", fill=(255, 220, 0, 220))
    draw.rectangle([8, 28, 22, 42], outline=(255, 60, 60, 255), width=2)
    draw.text((26, 30), "Optic Cup", fill=(255, 60, 60, 220))

    result_rgba = np.array(overlay_pil)
    return _to_b64(result_rgba[:, :, :3])


# ─────────────────────────────────────────────────────────────────────────────
# Full Explanation Panel
# ─────────────────────────────────────────────────────────────────────────────

def generate_explanation_panel(
    image_bytes: bytes,
    dr_grade: int = 2,
    cup_disc_ratio: float = 0.45,
    size: int = 256,
) -> str:
    """
    2×2 panel: Original | Grad-CAM | Attention | Vessel overlay
    """
    rgb_np = _load_rgb(image_bytes, size)
    original = (rgb_np * 255).astype(np.uint8)

    # Generate each component at smaller size
    gradcam_b64  = generate_gradcam(image_bytes, dr_grade, size)
    attn_b64     = generate_attention_map(image_bytes, dr_grade, size)
    vessel_b64   = generate_vessel_mask(image_bytes, size)

    def b64_to_np(b64: str) -> np.ndarray:
        data = base64.b64decode(b64)
        img = Image.open(io.BytesIO(data)).convert("RGB").resize((size, size))
        return np.array(img)

    gradcam_np = b64_to_np(gradcam_b64)[:, :size]   # strip colorbar if present
    attn_np    = b64_to_np(attn_b64)
    vessel_np  = b64_to_np(vessel_b64)

    # 2×2 canvas with labels
    gap = 4
    label_h = 20
    panel_w = size * 2 + gap
    panel_h = (size + label_h) * 2 + gap

    panel = np.zeros((panel_h, panel_w, 3), dtype=np.uint8)

    tiles = [
        (0,     0,     original,   "Original Fundus"),
        (0,     1,     gradcam_np, "Grad-CAM"),
        (1,     0,     attn_np,    "Attention Map"),
        (1,     1,     vessel_np,  "Vessel Segmentation"),
    ]

    for row, col, img_np, label in tiles:
        y0 = row * (size + label_h + gap)
        x0 = col * (size + gap)

        # Label bar
        label_bar = np.zeros((label_h, size, 3), dtype=np.uint8)
        label_bar[:] = [20, 20, 32]  # dark navy
        panel[y0:y0 + label_h, x0:x0 + size] = label_bar

        # Image
        resized = np.array(Image.fromarray(img_np).resize((size, size)))
        panel[y0 + label_h:y0 + label_h + size, x0:x0 + size] = resized

    # Add text via PIL
    panel_pil = Image.fromarray(panel)
    draw = ImageDraw.Draw(panel_pil)
    labels_pos = [
        (4,   4,                           "Original Fundus"),
        (size + gap + 4, 4,                "Grad-CAM Explainability"),
        (4,   size + label_h + gap + 4,    "ViT Attention Map"),
        (size + gap + 4, size+label_h+gap+4,"Vessel Segmentation"),
    ]
    for x, y, text in labels_pos:
        draw.text((x, y), text, fill=(0, 255, 135))

    return _to_b64(np.array(panel_pil))


# ─────────────────────────────────────────────────────────────────────────────
# Main entry point: generate ALL demo images from image bytes
# ─────────────────────────────────────────────────────────────────────────────

def generate_all_demo_visuals(
    image_bytes: bytes,
    dr_grade: int = 2,
    cup_disc_ratio: float = 0.45,
) -> dict:
    """
    Generate all demo explainability + segmentation images.
    Returns dict compatible with FullAnalysisResult fields.
    """
    try:
        gradcam  = generate_gradcam(image_bytes, dr_grade)
        attn     = generate_attention_map(image_bytes, dr_grade)
        vessel   = generate_vessel_mask(image_bytes)
        optic    = generate_optic_disc_mask(image_bytes, cup_disc_ratio)
        panel    = generate_explanation_panel(image_bytes, dr_grade, cup_disc_ratio)
        return {
            "gradcam_image":     gradcam,
            "attention_image":   attn,
            "explanation_panel": panel,
            "vessel_mask":       vessel,
            "optic_disc_mask":   optic,
        }
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Demo visual generation failed: {e}")
        return {
            "gradcam_image":     None,
            "attention_image":   None,
            "explanation_panel": None,
            "vessel_mask":       None,
            "optic_disc_mask":   None,
        }
