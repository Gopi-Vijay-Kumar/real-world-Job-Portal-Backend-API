# Job Portal Backend REST API

A secure, real-world, role-based RESTful API for a Job Portal built with **Node.js**, **Express.js**, **MongoDB (Mongoose ODM)**, **JSON Web Tokens (JWT)** stored in **httpOnly cookies**, and **bcrypt password hashing**.

This backend API supports 3 distinct user roles with strict access controls:
- 👨‍💻 **Job Seeker**: Create & maintain profile, explore available job postings, submit applications, track application status.
- 🏢 **Employer**: Post jobs, manage owned job postings (update/delete), review applications received for owned jobs, update application statuses.
- ⚙️ **Admin**: Platform-level administration, manage users (view, update status, delete), manage job postings, delete invalid/inappropriate postings, view platform statistics.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
|---|---|---|
| **Runtime** | Node.js | Asynchronous event-driven JavaScript runtime |
| **Framework** | Express.js (v5) | Web application framework for REST APIs |
| **Database** | MongoDB | NoSQL document database |
| **ODM** | Mongoose (v9) | Object Data Modeling library |
| **Authentication** | JWT (`jsonwebtoken`) | Signed JSON Web Tokens stored in `httpOnly` cookies |
| **Security** | `bcryptjs` | Password hashing with 12 salt rounds |
| **Cookie Storage** | `cookie-parser` | Parse HTTP cookies attached to requests |
| **Configuration** | `dotenv` | Environment variable management |
| **API Testing** | Postman | End-to-end API test collection included |

---

## 📐 Database Design & Architecture Rationale

The database is designed around **Mongoose schemas** featuring a hybrid approach of **Embedded Documents** and **Referenced Documents**.

```
                       +-------------------+
                       |    User Model     |
                       |  (Employer / JS)  |
                       +---------+---------+
                                 | 1
                                 |
                                 | N (Referenced via employerId)
                       +---------v---------+
                       |    Job Model      |
                       +---------+---------+
                                 | 1
                                 |
                                 | N (Referenced via jobId)
                       +---------v---------+
                       | Application Model |
                       +-------------------+
                                 ^
                                 | N (Referenced via applicantId)
                                 |
                       +---------+---------+
                       | User (Job Seeker) |
                       +-------------------+
```

### 🧠 Design Exercise: Embedded vs. Referenced Data Decisions

#### 1. Embedded Data
- **User Skills (`skills`: `[String]`)**: Array of skills directly embedded within the `User` document.
- **User Experience (`experience`: `[Subdocument]`)**: Array of objects (`company`, `title`, `startDate`, `endDate`, `description`).
- **User Education (`education`: `[Subdocument]`)**: Array of objects (`institution`, `degree`, `fieldOfStudy`, `startDate`, `endDate`).
- **Job Salary Range (`salaryRange`: `Subdocument`)**: Object containing `min`, `max`, and `currency`.

> **Why Embedded?**
> - **Co-location & Read Efficiency**: Skills, experience, and education belong strictly to a single user profile. They are almost always retrieved and updated together whenever a profile is viewed or modified.
> - **Lifecycle Dependency**: Work experience and education entries do not exist independently outside the context of a candidate's profile.
> - **Performance**: Embedding avoids expensive multi-collection `$lookup` joins, resulting in faster database read operations.

#### 2. Referenced Data
- **`Job.employerId` -> References `User`**: Points to the `User` document with `EMPLOYER` role.
- **`Application.jobId` -> References `Job`**: Points to the target `Job` document.
- **`Application.applicantId` -> References `User`**: Points to the `User` document with `JOB SEEKER` role.

> **Why Referenced?**
> - **Independent Lifecycle**: Users, Jobs, and Applications each have distinct lifecycles and identities.
> - **Unbounded Growth Avoidance**: Storing job postings or applications inside a User document would quickly breach MongoDB's 16MB document size limit as data grows.
> - **Many-to-Many Relationship**: Applications form a dynamic link between Job Seekers and Job postings. Referencing allows fast querying, indexing, and bidirectional population using Mongoose `.populate()`.

---

## 🔒 Security & Authentication Architecture

1. **Password Security**: Passwords are hashed using `bcryptjs` (salt factor: `12`) before saving. Passwords are never stored in plain text.
2. **Password Masking**: The `password` field in `userModel` is configured with `select: false`. It is automatically stripped from all API responses (registration, login, profile view, user listings).
3. **httpOnly Cookie Authentication**:
   - Upon successful login, a signed JWT containing user ID and role is generated.
   - The token is sent in an `httpOnly` cookie (`accessToken`), preventing client-side JavaScript access and mitigating XSS attacks.
4. **Role-Based Access Control (RBAC)**:
   - `verifyToken` middleware validates the cookie token.
   - `allowedRoles(...roles)` middleware verifies role authorization before granting access to protected routes.
5. **Database Level Uniqueness**:
   - Compound unique index `{ applicantId: 1, jobId: 1 }` on `Application` model enforces single application per job at the database level.

---

## 🔑 User Roles & Access Control Matrix

| Action / Endpoint | Job Seeker | Employer | Admin | Public |
|---|:---:|:---:|:---:|:---:|
| Register / Login / Logout | ✅ | ✅ | ✅ | ✅ |
| View All Jobs / Job Details | ✅ | ✅ | ✅ | ✅ |
| Manage Own Profile | ✅ | ❌ | ❌ | ❌ |
| Submit Job Application | ✅ | ❌ | ❌ | ❌ |
| View Own Submitted Applications | ✅ | ❌ | ❌ | ❌ |
| Create Job Posting | ❌ | ✅ | ❌ | ❌ |
| Manage (Edit/Delete) Own Jobs | ❌ | ✅ | ❌ | ❌ |
| Review Received Applications | ❌ | ✅ | ❌ | ❌ |
| Update Application Status | ❌ | ✅ | ❌ | ❌ |
| Manage Platform Users (CRUD) | ❌ | ❌ | ✅ | ❌ |
| Delete Any Inappropriate Job | ❌ | ❌ | ✅ | ❌ |
| View Platform Summary Stats | ❌ | ❌ | ✅ | ❌ |

---

## 📡 API Reference Overview

### 🔹 Job Seeker Endpoints (`/jobSeeker-api`)

| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `POST` | `/jobSeeker-api/users` | Public | Register a new Job Seeker account |
| `POST` | `/jobSeeker-api/users/login` | Public | Login Job Seeker & receive `httpOnly` cookie |
| `GET` | `/jobSeeker-api/users` | `JOB SEEKER` | View own profile |
| `PUT` | `/jobSeeker-api/users` | `JOB SEEKER` | Update own profile (skills, education, experience) |
| `GET` | `/jobSeeker-api/jobs` | Public | View all active available job postings |
| `GET` | `/jobSeeker-api/jobs/:jobId` | Public | View single job details by ID |
| `POST` | `/jobSeeker-api/jobs/:jobId/apply` | `JOB SEEKER` | Apply for a job (prevents duplicate applications) |
| `GET` | `/jobSeeker-api/applications` | `JOB SEEKER` | View own submitted applications with populated job info |
| `POST` | `/jobSeeker-api/logout` | Public | Logout & clear authentication cookie |

### 🔹 Employer Endpoints (`/employer-api`)

| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `POST` | `/employer-api/users` | Public | Register a new Employer account |
| `POST` | `/employer-api/users/login` | Public | Login Employer & receive `httpOnly` cookie |
| `POST` | `/employer-api/jobs` | `EMPLOYER` | Create a new job posting |
| `GET` | `/employer-api/jobs` | `EMPLOYER` | View own job postings |
| `GET` | `/employer-api/jobs/:jobId` | Public | View specific job posting details |
| `PUT` | `/employer-api/jobs/:jobId` | `EMPLOYER` | Update own job posting |
| `DELETE` | `/employer-api/jobs/:jobId` | `EMPLOYER` | Delete own job posting |
| `GET` | `/employer-api/applications` | `EMPLOYER` | View applications received for owned jobs |
| `PUT` | `/employer-api/applications/:applicationId` | `EMPLOYER` | Update application status (`Applied`, `Reviewed`, `Accepted`, `Rejected`) |
| `POST` | `/employer-api/logout` | Public | Logout & clear authentication cookie |

### 🔹 Admin Endpoints (`/admin-api`)

| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `POST` | `/admin-api/users` | Public | Register Admin account |
| `POST` | `/admin-api/admin/login` | Public | Admin login & receive `httpOnly` cookie |
| `GET` | `/admin-api/users` | `ADMIN` | View all registered users |
| `GET` | `/admin-api/users/:userId` | `ADMIN` | View specific user details by ID |
| `PUT` | `/admin-api/users/:userId` | `ADMIN` | Update user status or details |
| `DELETE` | `/admin-api/users/:userId` | `ADMIN` | Delete user account |
| `GET` | `/admin-api/jobs` | `ADMIN` | View all job postings across the platform |
| `GET` | `/admin-api/jobs/:jobId` | `ADMIN` | View job posting by ID |
| `DELETE` | `/admin-api/jobs/:jobId` | `ADMIN` | Remove inappropriate or invalid job posting |
| `GET` | `/admin-api/stats` | `ADMIN` | Review platform metrics summary |
| `POST` | `/admin-api/logout` | Public | Logout & clear authentication cookie |

---

## ⚙️ Environment Configuration

Create a `.env` file in the project root:

```env
PORT=4000
DB_URL=mongodb://localhost:27017/job-portal-db
SECRET_KEY=your_jwt_secret_key_here
NODE_ENV=development
```

---

## 🚀 Getting Started & Execution

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/manvithagolla08-ui/job-portal-backend.git
   cd job-portal-backend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Server**:
   ```bash
   npm start
   ```
   The server will start at `http://localhost:4000`.

---

## 🧪 Postman Testing Guide

A complete Postman collection is included: `job-portal-db.postman_collection.json`.

1. Open **Postman** and click **Import**.
2. Select `job-portal-db.postman_collection.json`.
3. Set the `baseUrl` variable to `http://localhost:4000`.
4. Ensure cookie handling is enabled in Postman settings to test the `httpOnly` token flow.
5. Execute requests in order:
   - Register & Login (Job Seeker / Employer / Admin).
   - Create Job Postings & Browse Jobs.
   - Apply for Jobs & Check Duplicate Application Prevention.
   - Review Applications & Update Status.
   - Test Admin User Management, Job Cleanup, and Platform Stats.