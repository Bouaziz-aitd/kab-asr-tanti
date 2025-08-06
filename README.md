---
title: Kabyle ASR Web App
emoji: 🌍
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---
# Kabyle ASR Web App on Hugging Face Spaces

This is a Hugging Face Space for a Kabyle Automatic Speech Recognition (ASR) web application.

The backend is a Flask app that uses the `nvidia/stt_kab_conformer_transducer_large` NeMo ASR model to transcribe Kabyle speech. The frontend is a separate React application that communicates with this backend.