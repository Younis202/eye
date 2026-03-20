# RetinaGPT — Training Guide
## Optimised for: RTX 4060 8GB · i7-13650HX · 24GB DDR5

---

## STEP 1 — Download the Project

1. In Replit → click the **three dots (⋯)** menu → **Download as ZIP**
2. Extract to anywhere on your PC, e.g. `C:\Projects\retinagpt\`
3. Open **VS Code** → `File → Open Folder` → select the extracted folder

---

## STEP 2 — Python 3.10

Make sure you have Python **3.10.x** (not 3.11 or 3.12 — some packages need 3.10).

Download: https://www.python.org/downloads/release/python-31011/  
During install: **tick "Add Python to PATH"**

```
python --version
# Expected: Python 3.10.x
```

---

## STEP 3 — CUDA 12.1 (GPU driver)

Your RTX 4060 uses **CUDA 12.1**.  
Download: https://developer.nvidia.com/cuda-12-1-0-download-archive

After install, verify:
```
nvcc --version
# Expected: Cuda compilation tools, release 12.1
```

> If nvcc is not found, CUDA wasn't added to PATH.  
> Add `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.1\bin` to your system PATH.

---

## STEP 4 — Open Terminal Inside the backend Folder

In VS Code terminal (`Ctrl + ~`):

```powershell
cd backend
```

---

## STEP 5 — Create Virtual Environment

```powershell
python -m venv venv
venv\Scripts\activate
```

You should see `(venv)` at the start of every line.

Upgrade pip to avoid warnings:
```powershell
python -m pip install --upgrade pip
```

---

## STEP 6 — Install PyTorch with CUDA **first**

> **Important:** Do this BEFORE `pip install -r requirements.txt` so pip doesn't pull the CPU-only version.

```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

Verify your GPU is detected:
```powershell
python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"
```

Expected output:
```
True
NVIDIA GeForce RTX 4060 Laptop GPU
```

---

## STEP 7 — Install All Requirements

```powershell
pip install -r requirements.txt
```

Takes 5–10 minutes. A few warnings about legacy builds are normal — as long as it ends with `Successfully installed ...`, you're good.

---

## STEP 8 — Download Dataset (APTOS 2019 — Start Here)

APTOS 2019 is the primary dataset: 3,662 fundus photos labelled for DR grading (0–4).

1. Go to: https://www.kaggle.com/competitions/aptos2019-blindness-detection/data
2. Log in to Kaggle and accept the competition rules
3. Download `train_images.zip` and `train.csv`
4. Place them like this inside the `backend` folder:

```
backend/
└── data/
    └── aptos/
        ├── train_images/       ← extract all .png images here
        └── train.csv           ← image IDs + DR grade (0–4)
```

### Optional Datasets (add later for better accuracy)

| Dataset | Folder | Task |
|---|---|---|
| EyePACS (88K images) | `data/eyepacs/train/` + `trainLabels.csv` | DR Grading |
| IDRiD (516 images) | `data/idrid/` | DR + Lesion Segmentation |
| REFUGE (1200 images) | `data/refuge/Training400/` | Glaucoma |
| DRIVE (40 images) | `data/drive/training/` | Vessel Segmentation |

---

## STEP 9 — Verify Dataset is Loaded Correctly

```powershell
python -c "
from training.dataset_manager import DatasetManager
dm = DatasetManager('./data')
train, val, test = dm.get_classification_loaders('aptos', batch_size=8)
print(f'Train: {len(train.dataset)}, Val: {len(val.dataset)}, Test: {len(test.dataset) if test else 0}')
"
```

Expected output:
```
Train: 2926, Val: 549, Test: 183
```

> Numbers may vary slightly due to stratified random split.

---

## STEP 10 — Start Training

### Option A — Quick Smoke Test (2 minutes — run this first!)

Confirms your GPU, data pipeline, and model all work before committing hours of training:

```powershell
python scripts/train.py ^
  --stage multitask ^
  --data_dir data ^
  --epochs 3 ^
  --batch_size 8 ^
  --max_samples 200
```

> On Windows PowerShell, use `^` for line continuation (not `\`).

You should see a progress bar and loss values decreasing. If it finishes without error, everything works.

---

### Option B — Full DR Grading Training (Recommended First Run)

```powershell
python scripts/train.py ^
  --stage multitask ^
  --data_dir data ^
  --epochs 50 ^
  --batch_size 24 ^
  --lr 0.0001 ^
  --precision fp16 ^
  --grad_accum 4 ^
  --num_workers 6
```

| Parameter | Value | Why |
|---|---|---|
| `--batch_size 24` | Fits in 8GB VRAM with fp16 |  |
| `--precision fp16` | Halves VRAM usage, same accuracy |  |
| `--grad_accum 4` | Effective batch = 96 without OOM |  |
| `--num_workers 6` | Matches your CPU core count |  |

Checkpoint saved to: `checkpoints/multitask/multitask_best.pt`

---

### Option C — Self-Supervised Pretraining + Fine-tune (Best Accuracy)

Run this if you want maximum model quality. Takes longer but gives better clinical results.

**Stage 1: DINO Pretraining** (no labels needed — runs overnight ~5–8 hrs)
```powershell
python scripts/train.py ^
  --stage dino ^
  --data_dir data ^
  --epochs 100 ^
  --batch_size 32
```

**Stage 2: Fine-tune on top of DINO checkpoint**
```powershell
python scripts/train.py ^
  --stage multitask ^
  --dino_checkpoint checkpoints/dino/retina_dino_best.pt ^
  --data_dir data ^
  --epochs 50 ^
  --batch_size 24 ^
  --precision fp16
```

---

## STEP 11 — Monitor Training

Open a **second terminal** (keep training running in the first):

```powershell
cd backend
venv\Scripts\activate
tensorboard --logdir logs
```

Then open: http://localhost:6006

You'll see live loss curves, accuracy, and per-class metrics updating every epoch.

---

## STEP 12 — Run the Backend API with Your Trained Model

After training finishes:

```powershell
set RETINA_CHECKPOINT=checkpoints/multitask/multitask_best.pt
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

The API runs at: http://localhost:8000  
Health check: http://localhost:8000/health  
Interactive docs: http://localhost:8000/docs

The frontend (running on Replit) automatically connects to `localhost:8000`.

---

## Expected Training Times on Your Hardware

| Stage | Dataset | Epochs | Estimated Time |
|---|---|---|---|
| Smoke test | 200 samples | 3 | ~2 min |
| Full DR grading | APTOS (3.6K) | 50 | ~2–3 hours |
| Full DR grading | APTOS + EyePACS | 50 | ~12–18 hours |
| DINO pretraining | APTOS | 100 | ~5–8 hours |

---

## Troubleshooting

| Error | Fix |
|---|---|
| `CUDA out of memory` | Lower `--batch_size` to 16 or 12. Or add `--grad_accum 8`. |
| `torch.cuda.is_available()` returns `False` | Reinstall PyTorch with CUDA: `pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121` |
| `No data found for dataset 'aptos'` | Check folder structure in Step 8. Folder must be exactly `data/aptos/train_images/` |
| `ModuleNotFoundError: No module named X` | Run `pip install -r requirements.txt` again with venv active |
| `ValueError: size Field required` | Already fixed in code — make sure you pulled the latest version from Replit |
| `RuntimeError: Expected all tensors on same device` | Restart terminal, re-activate venv, run again |
| Training stuck on epoch 1 | Reduce `--num_workers` to 2 (Windows sometimes has multiprocessing issues) |
| `nvcc not found` | Add CUDA bin folder to Windows PATH (see Step 3) |
| Pip warning about old version | Run `python -m pip install --upgrade pip` then retry |

---

## Quick Reference Card

```powershell
# Activate environment (run this every time you open a terminal)
venv\Scripts\activate

# Smoke test
python scripts/train.py --stage multitask --data_dir data --epochs 3 --batch_size 8 --max_samples 200

# Full training
python scripts/train.py --stage multitask --data_dir data --epochs 50 --batch_size 24 --precision fp16 --grad_accum 4 --num_workers 6

# TensorBoard
tensorboard --logdir logs

# Start API with trained model
set RETINA_CHECKPOINT=checkpoints/multitask/multitask_best.pt
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

---

## Dataset Links

| Dataset | URL | Images | Task |
|---|---|---|---|
| APTOS 2019 | https://www.kaggle.com/competitions/aptos2019-blindness-detection | 3,662 | DR Grading (Start Here) |
| EyePACS | https://www.kaggle.com/competitions/diabetic-retinopathy-detection | 88,702 | DR Grading |
| IDRiD | https://idrid.grand-challenge.org | 516 | DR + Lesion Seg |
| REFUGE | https://refuge.grand-challenge.org | 1,200 | Glaucoma |
| DRIVE | https://drive.grand-challenge.org | 40 | Vessel Seg |
| ODIR-5K | https://odir2019.grand-challenge.org | 8,000 | Multi-Disease |
