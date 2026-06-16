#!/usr/bin/env python3
"""Main application window for RAVE."""

import customtkinter as ctk
import cv2
from tkinter import ttk
from PIL import Image, ImageTk
import threading


class MainWindow(ctk.CTk):
    """Main window for RAVE application."""
    
    def __init__(self):
        super().__init__()
        
        self.title("RAVE - Real-Time Artistic Vision Engine")
        self.geometry("1280x720")
        
        self.cap = None
        self.style_var = ctk.StringVar(value="van_gogh")
        self.intensity_var = ctk.DoubleVar(value=1.0)
        
        self._setup_ui()
    
    def _setup_ui(self):
        # Video display
        self.video_label = ctk.CTkLabel(self, text="")
        self.video_label.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Controls frame
        controls = ctk.CTkFrame(self)
        controls.pack(fill="x", padx=10, pady=10)
        
        # Style selector
        ctk.CTkLabel(controls, text="Style:").pack(side="left", padx=5)
        style_menu = ctk.CTkComboBox(
            controls,
            values=["van_gogh", "picasso", "monet", "hokusai"],
            variable=self.style_var,
        )
        style_menu.pack(side="left", padx=5)
        
        # Intensity slider
        ctk.CTkLabel(controls, text="Intensity:").pack(side="left", padx=5)
        intensity_slider = ctk.CTkSlider(
            controls,
            from_=0,
            to=1,
            variable=self.intensity_var,
        )
        intensity_slider.pack(side="left", padx=5)
        
        # Capture button
        capture_btn = ctk.CTkButton(
            controls,
            text="📸 Capture",
            command=self._capture_frame,
        )
        capture_btn.pack(side="right", padx=5)
        
        # Start button
        start_btn = ctk.CTkButton(
            controls,
            text="▶ Start Camera",
            command=self._start_camera,
        )
        start_btn.pack(side="right", padx=5)
    
    def _start_camera(self):
        self.cap = cv2.VideoCapture(0)
        self._update_frame()
    
    def _update_frame(self):
        if self.cap:
            ret, frame = self.cap.read()
            if ret:
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                img = Image.fromarray(frame)
                img = img.resize((1260, 720))
                photo = ImageTk.PhotoImage(image=img)
                self.video_label.configure(image=photo)
                self.video_label.image = photo
        
        self.after(10, self._update_frame)
    
    def _capture_frame(self):
        if self.cap:
            ret, frame = self.cap.read()
            if ret:
                cv2.imwrite("capture.png", frame)
    
    def destroy(self):
        if self.cap:
            self.cap.release()
        super().destroy()