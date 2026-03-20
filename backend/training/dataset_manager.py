"""
dataset_manager.py — Retina-GPT Dataset Manager
=================================================
Unified dataset management for all retinal fundus datasets.

Supported datasets:
    APTOS 2019      — 3,662 images, DR grading (0-4)
    EyePACS         — 88,702 images, DR grading (0-4)
    ODIR-5K         — 8,000 patients, multi-disease
    REFUGE          — 1,200 images, glaucoma + disc/cup segmentation
    IDRiD           — 516 images, DR + lesion segmentation + grading
    DRIVE           — 40 images, vessel segmentation
    STARE           — 20 images, vessel segmentation
    Messidor-2      — 1,748 images, DR grading
    RFMiD           — 3,200 images, 46 disease categories
    Kaggle DR       — 35,126 images, DR grading
"""

import logging
from pathlib import Path
from typing import Optional, Dict, List, Tuple

import torch
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
import numpy as np
import pandas as pd
import cv2
import albumentations as A
from albumentations.pytorch import ToTensorV2

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Dataset Metadata Catalog
# ─────────────────────────────────────────────────────────────────────────────

DATASET_CATALOG = {
    "aptos": {
        "name": "APTOS 2019 Blindness Detection",
        "size": 3662,
        "tasks": ["dr_grading"],
        "labels": ["No DR", "Mild", "Moderate", "Severe", "Proliferative DR"],
        "num_classes": 5,
        "image_folder": "train_images",
        "label_csv": "train.csv",
        "label_col": "diagnosis",
        "id_col": "id_code",
        "image_ext": ".png",
    },
    "eyepacs": {
        "name": "EyePACS DR Grading",
        "size": 88702,
        "tasks": ["dr_grading"],
        "labels": ["No DR", "Mild", "Moderate", "Severe", "Proliferative DR"],
        "num_classes": 5,
        "image_folder": "train",
        "label_csv": "trainLabels.csv",
        "label_col": "level",
        "id_col": "image",
        "image_ext": ".jpeg",
    },
    "odir": {
        "name": "ODIR-5K Ocular Disease Recognition",
        "size": 8000,
        "tasks": ["multi_disease"],
        "num_classes": 8,
        "image_folder": "Training Images",
        "label_csv": "ODIR-5K_Training_Annotations.xlsx",
    },
    "idrid": {
        "name": "IDRiD - Indian Diabetic Retinopathy Image Dataset",
        "size": 516,
        "tasks": ["dr_grading", "lesion_segmentation"],
        "num_classes": 5,
        "image_folder": "Original Images/a. Training Set",
        "label_csv": "a. IDRiD_Disease Grading/1. Original Images/a. Training Set",
        "has_masks": True,
        "mask_folders": {
            "microaneurysm": "B. IDRiD_segmentation/Lesion Segmentations/Training Set/1. Microaneurysms",
            "hemorrhage":    "B. IDRiD_segmentation/Lesion Segmentations/Training Set/2. Haemorrhages",
            "hard_exudate":  "B. IDRiD_segmentation/Lesion Segmentations/Training Set/3. Hard Exudates",
            "soft_exudate":  "B. IDRiD_segmentation/Lesion Segmentations/Training Set/4. Soft Exudates",
            "optic_disc":    "B. IDRiD_segmentation/Lesion Segmentations/Training Set/5. Optic Disc",
        },
    },
    "refuge": {
        "name": "REFUGE - Retinal Fundus Glaucoma Challenge",
        "size": 1200,
        "tasks": ["glaucoma", "disc_cup_segmentation"],
        "num_classes": 2,
        "image_folder": "Training400/Images",
        "label_csv": "Training400/GT",
        "has_masks": True,
    },
    "drive": {
        "name": "DRIVE - Digital Retinal Images for Vessel Extraction",
        "size": 40,
        "tasks": ["vessel_segmentation"],
        "image_folder": "training/images",
        "mask_folder": "training/1st_manual",
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# Augmentation Pipelines
# ─────────────────────────────────────────────────────────────────────────────

def get_classification_train_transforms(image_size: int = 224) -> A.Compose:
    return A.Compose([
        A.RandomResizedCrop(size=(image_size, image_size),
                            scale=(0.7, 1.0), ratio=(0.9, 1.1)),
        A.HorizontalFlip(p=0.5),
        A.VerticalFlip(p=0.2),
        A.Rotate(limit=20, p=0.5),
        A.OneOf([
            A.CLAHE(clip_limit=2.0, p=1.0),
            A.ColorJitter(brightness=0.2, contrast=0.3, saturation=0.1, p=1.0),
        ], p=0.8),
        A.OneOf([
            A.GaussianBlur(blur_limit=3, p=1.0),
            A.GaussNoise(std_range=(0.01, 0.05), p=0.5),
        ], p=0.3),
        A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ToTensorV2(),
    ])


def get_classification_val_transforms(image_size: int = 224) -> A.Compose:
    return A.Compose([
        A.Resize(height=image_size, width=image_size),
        A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ToTensorV2(),
    ])


def get_segmentation_train_transforms(image_size: int = 512) -> A.Compose:
    return A.Compose([
        A.RandomResizedCrop(size=(image_size, image_size), scale=(0.7, 1.0)),
        A.HorizontalFlip(p=0.5),
        A.VerticalFlip(p=0.3),
        A.Rotate(limit=15, p=0.5),
        A.ColorJitter(brightness=0.2, contrast=0.2, p=0.5),
        A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ToTensorV2(),
    ], additional_targets={"mask": "mask"})


# ─────────────────────────────────────────────────────────────────────────────
# FundusDataset
# ─────────────────────────────────────────────────────────────────────────────

class FundusDataset(Dataset):
    """
    Generic fundus image dataset.

    preprocess_fn note
    ------------------
    RetinaPreprocessor is invoked via __call__, NOT via a .preprocess() method.
    Calling preprocess_fn(np_image) runs the full pipeline and returns a
    CHW float tensor.  When preprocess_fn is set we skip the albumentations
    transform entirely (the preprocessor already handles everything).
    """

    def __init__(
        self,
        image_paths: List[str],
        labels: Optional[List[int]] = None,
        image_size: int = 224,
        transform: Optional[A.Compose] = None,
        preprocess_fn=None,
        return_metadata: bool = False,
        dataset_name: str = "unknown",
    ):
        self.image_paths = image_paths
        self.labels = labels if labels is not None else [-1] * len(image_paths)
        self.image_size = image_size
        self.transform = transform
        self.preprocess_fn = preprocess_fn
        self.return_metadata = return_metadata
        self.dataset_name = dataset_name

    def __len__(self) -> int:
        return len(self.image_paths)

    def __getitem__(self, idx: int):
        path  = self.image_paths[idx]
        label = self.labels[idx]

        # ── Load ──────────────────────────────────────────────────────────
        image = cv2.imread(str(path))
        if image is None:
            image_tensor = torch.zeros(3, self.image_size, self.image_size)
            label_tensor = torch.tensor(label, dtype=torch.long)
            if self.return_metadata:
                return image_tensor, label_tensor, {"path": str(path), "error": True}
            return image_tensor, label_tensor

        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)   # uint8 HWC RGB

        # ── Preprocess / Augment ──────────────────────────────────────────
        if self.preprocess_fn is not None:
            # ✅ RetinaPreprocessor.__call__(np_array) → CHW float tensor
            try:
                image_tensor = self.preprocess_fn(image)
                if not isinstance(image_tensor, torch.Tensor):
                    image_tensor = torch.from_numpy(
                        image_tensor.transpose(2, 0, 1)
                    ).float()
            except Exception as e:
                logger.warning(f"RetinaPreprocessor failed for {path}: {e}")
                image = cv2.resize(image, (self.image_size, self.image_size))
                image_tensor = torch.from_numpy(
                    image.transpose(2, 0, 1)
                ).float() / 255.0

        elif self.transform is not None:
            aug = self.transform(image=image)
            image_tensor = aug["image"]

        else:
            image = cv2.resize(image, (self.image_size, self.image_size))
            image_tensor = torch.from_numpy(
                image.transpose(2, 0, 1)
            ).float() / 255.0

        label_tensor = torch.tensor(label, dtype=torch.long)

        if self.return_metadata:
            meta = {"path": str(path), "dataset": self.dataset_name, "idx": idx}
            return image_tensor, label_tensor, meta

        return image_tensor, label_tensor

    def get_class_weights(self) -> torch.Tensor:
        labels = np.array(self.labels)
        valid   = labels[labels >= 0]
        classes = np.unique(valid)
        counts  = np.bincount(valid)
        weights = 1.0 / (counts + 1e-6)
        weights = weights / weights.sum() * len(classes)
        return torch.tensor(weights, dtype=torch.float32)

    def get_sample_weights(self) -> torch.Tensor:
        cw = self.get_class_weights()
        return torch.tensor([
            cw[l].item() if l >= 0 else 1.0 for l in self.labels
        ])


# ─────────────────────────────────────────────────────────────────────────────
# SegmentationDataset
# ─────────────────────────────────────────────────────────────────────────────

class SegmentationDataset(Dataset):
    def __init__(
        self,
        image_paths: List[str],
        mask_paths: List[str],
        image_size: int = 512,
        transform: Optional[A.Compose] = None,
    ):
        assert len(image_paths) == len(mask_paths)
        self.image_paths = image_paths
        self.mask_paths  = mask_paths
        self.image_size  = image_size
        self.transform   = transform

    def __len__(self) -> int:
        return len(self.image_paths)

    def __getitem__(self, idx: int):
        image = cv2.cvtColor(cv2.imread(str(self.image_paths[idx])), cv2.COLOR_BGR2RGB)
        mask  = cv2.imread(str(self.mask_paths[idx]), cv2.IMREAD_GRAYSCALE)

        image = cv2.resize(image, (self.image_size, self.image_size))
        mask  = cv2.resize(mask,  (self.image_size, self.image_size),
                           interpolation=cv2.INTER_NEAREST)
        mask  = (mask > 127).astype(np.uint8)

        if self.transform:
            aug   = self.transform(image=image, mask=mask)
            image = aug["image"]
            mask  = torch.from_numpy(aug["mask"]).long()
        else:
            image = torch.from_numpy(image.transpose(2, 0, 1)).float() / 255.0
            mask  = torch.from_numpy(mask).long()

        return image, mask


# ─────────────────────────────────────────────────────────────────────────────
# DINOUnlabeledDataset / CLIPPairedDataset
# ─────────────────────────────────────────────────────────────────────────────

class DINOUnlabeledDataset(Dataset):
    def __init__(self, image_paths: List[str], multi_crop_aug):
        self.image_paths   = image_paths
        self.multi_crop_aug = multi_crop_aug

    def __len__(self) -> int:
        return len(self.image_paths)

    def __getitem__(self, idx: int):
        image = cv2.cvtColor(cv2.imread(str(self.image_paths[idx])), cv2.COLOR_BGR2RGB)
        return self.multi_crop_aug(image), -1


class CLIPPairedDataset(Dataset):
    def __init__(
        self,
        image_paths: List[str],
        texts: List[str],
        tokenizer,
        transform: Optional[A.Compose] = None,
        max_text_length: int = 128,
        image_size: int = 224,
    ):
        assert len(image_paths) == len(texts)
        self.image_paths    = image_paths
        self.texts          = texts
        self.tokenizer      = tokenizer
        self.transform      = transform or get_classification_val_transforms(image_size)
        self.max_text_length = max_text_length

    def __len__(self) -> int:
        return len(self.image_paths)

    def __getitem__(self, idx: int):
        image = cv2.cvtColor(cv2.imread(str(self.image_paths[idx])), cv2.COLOR_BGR2RGB)
        image_tensor = self.transform(image=image)["image"]
        tokens = self.tokenizer(
            self.texts[idx],
            return_tensors="pt",
            padding="max_length",
            truncation=True,
            max_length=self.max_text_length,
        )
        return (
            image_tensor,
            tokens["input_ids"].squeeze(0),
            tokens["attention_mask"].squeeze(0),
        )


# ─────────────────────────────────────────────────────────────────────────────
# DatasetManager
# ─────────────────────────────────────────────────────────────────────────────

class DatasetManager:
    """
    Unified dataset manager for all Retina-GPT training stages.
    """

    def __init__(
        self,
        data_root: str = "./data",
        cache_dir: Optional[str] = "./data/.cache",
        image_size: int = 224,
        num_workers: int = 4,
        pin_memory: bool = True,
    ):
        self.data_root  = Path(data_root)
        self.cache_dir  = Path(cache_dir) if cache_dir else None
        self.image_size = image_size
        self.num_workers = num_workers
        self.pin_memory  = pin_memory

        if self.cache_dir:
            self.cache_dir.mkdir(parents=True, exist_ok=True)

        self._preprocess_fn = self._load_preprocessor()

    def _load_preprocessor(self):
        """
        Load RetinaPreprocessor.

        IMPORTANT: RetinaPreprocessor works via __call__, not .preprocess().
        Usage:  tensor = preprocessor(np_image)   ← correct
        Usage:  tensor = preprocessor.preprocess(np_image)  ← WRONG (no such method)
        """
        try:
            import sys
            sys.path.insert(0, str(Path(__file__).parent.parent))
            from utils.preprocessing import RetinaPreprocessor
            preprocessor = RetinaPreprocessor()
            logger.info("[DatasetManager] RetinaPreprocessor loaded successfully.")
            return preprocessor
        except Exception as e:
            logger.warning(
                f"[DatasetManager] RetinaPreprocessor not available: {e}. "
                "Using albumentations transforms instead."
            )
            return None

    # ── Public Loaders ────────────────────────────────────────────────────────

    def get_classification_loaders(
        self,
        dataset: str,
        batch_size: int = 32,
        val_split: float = 0.15,
        test_split: float = 0.05,
        balanced_sampling: bool = True,
        task: str = "dr_grading",
    ) -> Tuple[DataLoader, DataLoader, Optional[DataLoader]]:

        paths, labels = self._load_classification_data(dataset, task)
        if not paths:
            raise FileNotFoundError(
                f"No data found for dataset '{dataset}'. "
                f"Expected at: {self.data_root / dataset}"
            )

        (train_p, val_p, test_p,
         train_l, val_l, test_l) = self._stratified_split(
            paths, labels, val_split, test_split
        )

        # Use preprocessor if available; otherwise albumentations
        aug_train = None if self._preprocess_fn else get_classification_train_transforms(self.image_size)
        aug_val   = None if self._preprocess_fn else get_classification_val_transforms(self.image_size)

        def _make_ds(p, l, aug):
            return FundusDataset(
                p, l,
                image_size=self.image_size,
                transform=aug,
                preprocess_fn=self._preprocess_fn,
                dataset_name=dataset,
            )

        train_ds = _make_ds(train_p, train_l, aug_train)
        val_ds   = _make_ds(val_p,   val_l,   aug_val)
        test_ds  = _make_ds(test_p,  test_l,  aug_val) if test_p else None

        sampler = None
        if balanced_sampling and len(set(train_l)) > 1:
            w = train_ds.get_sample_weights()
            sampler = WeightedRandomSampler(w, len(w), replacement=True)

        train_loader = DataLoader(
            train_ds, batch_size=batch_size,
            sampler=sampler, shuffle=(sampler is None),
            num_workers=self.num_workers, pin_memory=self.pin_memory,
            drop_last=True,
        )
        val_loader = DataLoader(
            val_ds, batch_size=batch_size * 2, shuffle=False,
            num_workers=self.num_workers, pin_memory=self.pin_memory,
        )
        test_loader = DataLoader(
            test_ds, batch_size=batch_size * 2, shuffle=False,
            num_workers=self.num_workers, pin_memory=self.pin_memory,
        ) if test_ds else None

        logger.info(
            f"[DatasetManager] {dataset} | "
            f"train={len(train_ds)}, val={len(val_ds)}, "
            f"test={len(test_ds) if test_ds else 0} | balanced={balanced_sampling}"
        )
        return train_loader, val_loader, test_loader

    def get_pretraining_loader(
        self,
        datasets: List[str],
        multi_crop_aug,
        batch_size: int = 64,
    ) -> DataLoader:
        all_paths = []
        for ds_name in datasets:
            paths = self._find_all_images(ds_name)
            all_paths.extend(paths)
            logger.info(f"[Pretraining] {ds_name}: {len(paths)} images")
        logger.info(f"[Pretraining] Total: {len(all_paths)} images")

        ds = DINOUnlabeledDataset(all_paths, multi_crop_aug)
        return DataLoader(
            ds, batch_size=batch_size, shuffle=True,
            num_workers=self.num_workers, pin_memory=self.pin_memory,
            drop_last=True, collate_fn=self._dino_collate_fn,
        )

    def get_segmentation_loaders(
        self,
        dataset: str,
        batch_size: int = 8,
        val_split: float = 0.15,
        image_size: int = 512,
    ) -> Tuple[DataLoader, DataLoader]:
        image_paths, mask_paths = self._load_segmentation_data(dataset)
        n = len(image_paths)
        if n == 0:
            raise FileNotFoundError(f"No segmentation data found for '{dataset}'.")

        n_val   = max(1, int(n * val_split))
        indices = np.random.permutation(n)
        val_idx, train_idx = indices[:n_val], indices[n_val:]

        train_ds = SegmentationDataset(
            [image_paths[i] for i in train_idx],
            [mask_paths[i]  for i in train_idx],
            image_size=image_size,
            transform=get_segmentation_train_transforms(image_size),
        )
        val_ds = SegmentationDataset(
            [image_paths[i] for i in val_idx],
            [mask_paths[i]  for i in val_idx],
            image_size=image_size,
        )

        return (
            DataLoader(train_ds, batch_size=batch_size, shuffle=True,
                       num_workers=self.num_workers, pin_memory=self.pin_memory),
            DataLoader(val_ds,   batch_size=batch_size, shuffle=False,
                       num_workers=self.num_workers, pin_memory=self.pin_memory),
        )

    def get_multitask_loaders(
        self,
        batch_size: int = 32,
        datasets: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Tuple[DataLoader, DataLoader]]:
        datasets = datasets or {
            "dr_grading": "aptos",
            "vessel_seg":  "drive",
            "glaucoma":    "refuge",
        }
        loaders = {}
        for task, ds_name in datasets.items():
            try:
                if "seg" in task:
                    train_l, val_l = self.get_segmentation_loaders(ds_name, batch_size)
                else:
                    train_l, val_l, _ = self.get_classification_loaders(
                        ds_name, batch_size, task=task
                    )
                loaders[task] = (train_l, val_l)
            except FileNotFoundError:
                logger.warning(
                    f"[DatasetManager] '{ds_name}' not found, skipping '{task}'"
                )
        return loaders

    # ── Internal Helpers ──────────────────────────────────────────────────────

    def _load_classification_data(
        self, dataset: str, task: str = "dr_grading"
    ) -> Tuple[List[str], List[int]]:
        ds_dir = self.data_root / dataset
        if not ds_dir.exists():
            return [], []

        meta       = DATASET_CATALOG.get(dataset, {})
        csv_name   = meta.get("label_csv",    "train.csv")
        img_folder = meta.get("image_folder", "train_images")
        label_col  = meta.get("label_col",    "diagnosis")
        id_col     = meta.get("id_col",       "id_code")
        ext        = meta.get("image_ext",    ".png")

        csv_path = ds_dir / csv_name
        img_dir  = ds_dir / img_folder

        if csv_path.exists() and img_dir.exists():
            try:
                df     = pd.read_csv(csv_path)
                paths  = [str(img_dir / f"{row[id_col]}{ext}") for _, row in df.iterrows()]
                labels = [int(row[label_col]) for _, row in df.iterrows()]
                paired = [(p, l) for p, l in zip(paths, labels) if Path(p).exists()]
                if paired:
                    paths, labels = zip(*paired)
                    return list(paths), list(labels)
            except Exception as e:
                logger.warning(f"Failed to load CSV for {dataset}: {e}")

        # Fallback: class sub-folders 0/, 1/, …
        paths, labels = [], []
        for cls_dir in sorted(ds_dir.glob("*")):
            if cls_dir.is_dir() and cls_dir.name.isdigit():
                for img_path in cls_dir.glob(f"*{ext}"):
                    paths.append(str(img_path))
                    labels.append(int(cls_dir.name))
        return paths, labels

    def _load_segmentation_data(
        self, dataset: str
    ) -> Tuple[List[str], List[str]]:
        ds_dir = self.data_root / dataset
        if not ds_dir.exists():
            return [], []

        meta        = DATASET_CATALOG.get(dataset, {})
        img_folder  = meta.get("image_folder", "images")
        mask_folder = meta.get("mask_folder",  "masks")

        img_dir  = ds_dir / img_folder
        mask_dir = ds_dir / mask_folder
        if not img_dir.exists():
            return [], []

        image_paths = sorted(
            p for p in img_dir.glob("*.*")
            if p.suffix.lower() in (".png", ".jpg", ".tif", ".jpeg")
        )
        mask_paths = []
        for p in image_paths:
            m = mask_dir / p.name
            if not m.exists():
                m = mask_dir / (p.stem + ".png")
            mask_paths.append(str(m))

        paired = [
            (str(i), m) for i, m in zip(image_paths, mask_paths)
            if Path(m).exists()
        ]
        if not paired:
            return [], []
        imgs, masks = zip(*paired)
        return list(imgs), list(masks)

    def _find_all_images(self, dataset: str) -> List[str]:
        ds_dir = self.data_root / dataset
        if not ds_dir.exists():
            logger.warning(f"Dataset directory not found: {ds_dir}")
            return []
        exts = {".png", ".jpg", ".jpeg", ".tif", ".tiff"}
        return sorted(str(p) for p in ds_dir.rglob("*") if p.suffix.lower() in exts)

    def _stratified_split(
        self,
        paths: List[str],
        labels: List[int],
        val_split: float,
        test_split: float,
    ) -> Tuple:
        from sklearn.model_selection import train_test_split
        indices   = np.arange(len(paths))
        test_size = test_split if test_split > 0 else 0

        try:
            if test_size > 0:
                idx_tv, idx_test = train_test_split(
                    indices, test_size=test_size, stratify=labels, random_state=42
                )
                lbl_tv = [labels[i] for i in idx_tv]
                idx_train, idx_val = train_test_split(
                    idx_tv, test_size=val_split / (1 - test_size),
                    stratify=lbl_tv, random_state=42
                )
            else:
                idx_test  = []
                idx_train, idx_val = train_test_split(
                    indices, test_size=val_split, stratify=labels, random_state=42
                )
        except ValueError:
            n = len(paths)
            perm      = np.random.permutation(n)
            n_test    = int(n * test_split)
            n_val     = int(n * val_split)
            idx_test  = perm[:n_test]
            idx_val   = perm[n_test:n_test + n_val]
            idx_train = perm[n_test + n_val:]

        def _sel(idx):
            return ([], []) if len(idx) == 0 else (
                [paths[i] for i in idx], [labels[i] for i in idx]
            )

        tp, tl = _sel(idx_train)
        vp, vl = _sel(idx_val)
        sp, sl = _sel(idx_test)
        return tp, vp, sp, tl, vl, sl

    @staticmethod
    def _dino_collate_fn(batch):
        num_crops = len(batch[0][0])
        collated  = [torch.stack([s[0][i] for s in batch]) for i in range(num_crops)]
        labels    = torch.tensor([s[1] for s in batch])
        return collated, labels

    def dataset_stats(self, dataset: str, task: str = "dr_grading") -> Dict:
        paths, labels = self._load_classification_data(dataset, task)
        if not paths:
            return {"error": f"Dataset '{dataset}' not found"}
        labels_arr = np.array(labels)
        classes, counts = np.unique(labels_arr, return_counts=True)
        stats = {
            "name": dataset,
            "total_samples": len(paths),
            "num_classes": len(classes),
            "class_distribution": {int(c): int(n) for c, n in zip(classes, counts)},
            "class_balance_ratio": float(counts.min() / counts.max()),
        }
        print(f"\n{'='*50}")
        print(f"Dataset: {DATASET_CATALOG.get(dataset, {}).get('name', dataset)}")
        print(f"Total samples: {stats['total_samples']:,}")
        label_names = DATASET_CATALOG.get(dataset, {}).get(
            "labels", [str(i) for i in classes]
        )
        for cls, count in zip(classes, counts):
            pct  = 100 * count / len(paths)
            name = label_names[cls] if cls < len(label_names) else str(cls)
            print(f"  Class {cls} ({name:25s}): {count:5d} ({pct:5.1f}%) {'█'*int(pct/2)}")
        print(f"Balance ratio: {stats['class_balance_ratio']:.3f}")
        print(f"{'='*50}\n")
        return stats

    def __repr__(self) -> str:
        available = [ds for ds in DATASET_CATALOG if (self.data_root / ds).exists()]
        return (
            f"DatasetManager(\n"
            f"  data_root={self.data_root}\n"
            f"  available_datasets={available}\n"
            f"  image_size={self.image_size}\n"
            f")"
        )