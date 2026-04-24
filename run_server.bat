@echo off
echo Starting Olivia 2.0 Backend Server...
echo Make sure you have installed the requirements: pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
