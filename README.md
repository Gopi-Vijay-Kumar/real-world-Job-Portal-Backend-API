# Job Portal Backend REST API

A Node.js & Express.js REST API with MongoDB (Mongoose) that implements role-based access control for Job Seekers, Employers, and Admins.

---

## Tech Stack & Dependencies

- Framework: `express`
- Database / ODM: `mongoose`
- Authentication: `jsonwebtoken` stored in cookies (`accessToken`)
- Security: `bcryptjs` for password hashing

---
### installations in terminal

-`npm install express`
-`npm install  mongoose`
-`npm install  bcryptjs`
-`npm install jsonwebtoken`
-`npm install cookie-parser`
-`npm install dotenv`


## Models & Schemas

### 1. User Model (`userModel.js`)
- `Fields:` `name`, `email` (unique, lowercase), `password` (min 4 chars), `role` (`JOB SEEKER`, `ADMIN`, `EMPLOYER`).
- `Embedded Structures:`
  - `skills`: Array of strings
  - `experience`: Array of objects (`company`, `title`, `startDate`, `endDate`, `description`)
  - `education`: Array of objects (`institution`, `degree`, `fieldOfStudy`, `startDate`, `endDate`)

### 2. Job Model (`jobModel.js`)
- `Fields`: `employerId` (ref: `user`), `title`, `company`, `description` (min 5 chars), `location`, `employmentType` (`Full-time`, `Part-time`, `Contract`, `Internship`, `Remote`), `salaryRange` (`min`, `max`, `currency`), `requiredSkills` (Array), `experienceRequirement`, `postedDate`, `applicationDeadline`, `jobStatus` (`active`, `archived`, `inactive`).

### 3. Application Model (`applicationModel.js`)
- **Fields:** `applicantId` (ref: `user`), `jobId` (ref: `job`), `applicationStatus` (`Applied`, `Reviewed`, `Accepted`, `Rejected`).

---

## Middlewares

- `verifyToken(req, res, next)`: Reads `accessToken` cookie. Verifies token using `process.env.SECRET_KEY` and attaches decoded payload to `req.user`. Returns `401` if missing or invalid.
- `allowedRoles(...roles)`: Checks if `req.user.role` is included in allowed roles. Calls `next()` if valid, or returns `403` if unauthorized.

---

##  API Routes

### Job Seeker Routes (`/jobseeker-api`)
- `POST /users` — Register job seeker (forces `role: "JOB SEEKER"`, hashes password).
- `POST /users/login` — Login job seeker, verifies password, sets `accessToken` cookie (`expiresIn: '1d'`).
- `GET /users` — View own profile `[verifyToken, allowedRoles("JOB SEEKER")]`.
- `PUT /users` — Update own profile `[verifyToken, allowedRoles("JOB SEEKER")]`.
- `GET /jobs` — View all jobs.
- `GET /jobs/:jobId` — View job details by ID.
- `POST /jobs/:jobId/apply` — Apply for job `[verifyToken, allowedRoles("JOB SEEKER")]` (prevents duplicate applications).
- `GET /applications`— View submitted applications `[verifyToken, allowedRoles("JOB SEEKER")]`.
- `POST /logout` — Clear `accessToken` cookie.

### Employer Routes (`/employer-api`)
- `POST /users` — Register employer (forces `role: "EMPLOYER"`, hashes password).
- `POST /users/login` — Login employer, verifies password, sets `accessToken` cookie (`expiresIn: '1d'`).
- `POST /jobs` — Create job posting `[verifyToken, allowedRoles("EMPLOYER")]`.
- `GET /jobs`— View own job postings `[verifyToken, allowedRoles("EMPLOYER")]`.
- `GET /jobs/:jobId` — View job details by ID.
- `PUT /jobs/:jobId` — Update own job posting `[verifyToken, allowedRoles("EMPLOYER")]`.
- `DELETE /jobs/:jobId` — Delete own job posting `[verifyToken, allowedRoles("EMPLOYER")]`.
- `GET /applications` — View applications received for owned jobs `[verifyToken, allowedRoles("EMPLOYER")]`.
- `PUT /applications/:applicationId` — Update application status `[verifyToken, allowedRoles("EMPLOYER")]`.

### Admin Routes (`/admin-api`)
- `POST /admin/login` — Admin login, verifies `role: "ADMIN"` & password, sets `accessToken` cookie.
- `GET /users` — View all users `[verifyToken, allowedRoles("ADMIN")]`.
- `GET /users/:userId` — View user by ID `[verifyToken, allowedRoles("ADMIN")]`.
- `PUT /users/:userId` — Update user details `[verifyToken, allowedRoles("ADMIN")]`.
- `DELETE /users/:userId` — Delete user `[verifyToken, allowedRoles("ADMIN")]`.
- `GET /jobs`— View all jobs.
- `GET /jobs/:jobId`— View job by ID.
- `DELETE /jobs/:jobId`— Delete inactive job `[verifyToken, allowedRoles("ADMIN")]` (deletes only if `jobStatus: "inactive"`).

---

## Environment Variables

Create a `.env` file in the root folder with the following keys:

```env
PORT=4000
DB_URL=mongodb://localhost:27017/job-portal-db
SECRET_KEY=your_jwt_secret_key_here
```
## API Documentation & Testing

A Postman collection is included in this repository to test all endpoints easily.

1. Import [job-portal-db.postman_collection.json](./job-portal-db.postman_collection.json) into Postman.
2. Set your environment base URL to `http://localhost:4000`.
3. Test the Job Seeker, Employer, and Admin routes.