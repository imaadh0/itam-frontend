# IT Asset Management - Frontend

The frontend for the IT Asset Management Service, built with Next.js, Tailwind CSS, and Shadcn UI.

## Prerequisites

- **Node.js**: v18.x or v20.x (LTS recommended)
- **npm**: v9 or later
- **Backend API**: The backend service must be running for the application to function.

## Environment Variables

Create a `.env.local` file in the root directory:

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | The full URL of the backend API (e.g., `http://localhost:5000/api`). |

## Getting Started

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd itam-frontend
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Set up environment**:
    Create `.env.local` and set `NEXT_PUBLIC_API_URL`.

4.  **Start the development server**:
    ```bash
    npm run dev
    ```
    Open `http://localhost:3000` in your browser.

> **Note**: The backend project must be set up and running (with the database seeded) before you can log in to the frontend.
