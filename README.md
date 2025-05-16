
# CADET.AI — AI-Powered Interview Platform
A RAG-based AI Interview Platform that automates and streamlines interviews, enabling unbiased evaluation and helping candidates demonstrate their **true calibre**.

## Overview

This project was developed as part of the **Future Forge Hackathon (May 2025)** by Team Hacktivist under the theme:

**"Future of Assessment & Quality Prediction"**

Traditional interviews suffer from:

Subjectivity and bias
Time constraints
Scalability limitations
Cheating risks

**CADET.AI** solves these using AI-driven automation, real-time authentication, and objective evaluation.

## Tech Stack (MEAN + AI)

**Frontend:** Angular 19, Tailwind CSS

**Backend:** Node.js, Express.js

**Database:** MongoDB (Atlas)

**AI & Features:**

- Face Recognition
- Adaptive Questioning (RAG-based)
- Real-time Evaluation
- Post-Interview Report Generation

## Features

### 1. Admin-Scheduled Interviews

Subject & difficulty selection
Automated calendar invites
Question bank with dynamic difficulty


### 2. Face Recognition Module

Biometric profile creation (10+ images)
Continuous authentication
Suspicious activity alerts


### 3. Live AI Interview

Adaptive Q&A based on response
IDE for coding tasks
Real-time transcript & evaluation


### 4. Post-Interview Evaluation

Technical & behavioral scoring
Sentiment & tone analysis
Integrity verification & flagging



##  Evaluation Metrics

| **Category**          | **Metrics**                                      |
|---------------------- |--------------------------------------------------|
| Technical Skills      | Code Efficiency, Completeness, Error Handling    |
| Behavioral Analysis   | Communication, Confidence, Clarity               |
| Final Scoring         | Weighted scores with penalties                   |

## Installation Prerequisites


### 1. Clone the Repository

git clone **https://git.garage.epam.com/hacktivist/hacktivist.git**
cd hacktivist


### 2. Node.js & npm
- Install Node.js (which includes npm) from [https://nodejs.org](https://nodejs.org)
- Verify installation:


 ### 3. Angular CLI
-- Install globally using npm:
npm install -g @angular/cli

### 4. MongoDB
- Option A: Use MongoDB Atlas cloud service (recommended)
- Option B: Install MongoDB Community Server locally from **https://www.mongodb.com/try/download/community**
-- Verify MongoDB installation (if local):
mongod --version
Set your MongoDB connection string in .env inside the backend folder.

### 5. Express.js
Express.js is included as a backend dependency. Install it inside the backend folder with:
- npm install express
- No global install is required.

### 6. Tailwind CSS
Install Tailwind CSS and related packages inside your Angular frontend project folder:
- npm install -D tailwindcss postcss autoprefixer
- npx tailwindcss init
Configure your tailwind.config.js and integrate Tailwind CSS with Angular’s build process using PostCSS.



## Setup Frontend
- cd cadet_ai
- npm install
- ng serve


## Setup Backend
- cd backend
- npm install
- npm start


## Usage
- Admin schedules and manages interviews
- Candidates complete biometric verification
- AI conducts adaptive interviews with live evaluation
- Reports generated post-interview with detailed scoring and feedback


## Contributing
-- We welcome contributions! Please follow these steps:
- Fork the repo
- Create a new branch (feature/your-feature)
- Commit and push your changes
- Open a merge request

--Please ensure:
- Code follows Angular best practices
- Commit messages are clear
- Merge conflicts are resolved before PR


## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Project Status
Active development. Version 1.0 completed for EPAM Hackathon 2025.

## License
EPAM Hackathon © 2025 — Internal Use Only. Not for commercial redistribution.


