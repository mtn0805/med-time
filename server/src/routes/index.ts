import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config/env.js';
import { AuthController } from '../controllers/auth.controller.js';
import { DoctorController } from '../controllers/doctor.controller.js';
import { AppointmentController } from '../controllers/appointment.controller.js';
import { AdminController } from '../controllers/admin.controller.js';
import { FeedbackController } from '../controllers/feedback.controller.js';
import { UserRepository } from '../repositories/user.repository.js';
import { DoctorRepository } from '../repositories/doctor.repository.js';
import { AvailabilityRepository } from '../repositories/availability.repository.js';
import { AppointmentRepository } from '../repositories/appointment.repository.js';
import { FeedbackRepository } from '../repositories/feedback.repository.js';
import { AuthService } from '../services/auth.service.js';
import { DoctorService } from '../services/doctor.service.js';
import { AdminService } from '../services/admin.service.js';
import { FeedbackService } from '../services/feedback.service.js';
import { SchedulingService } from '../services/scheduling.service.js';
import { ScheduleLock } from '../services/lock.service.js';
import { EventBus } from '../services/events.service.js';
import { authenticate, requireRole } from '../middleware/auth.js';
/** Composition root: dependencies are explicit and shared within this API instance. */
export function createRouter() {
  const router = Router();
  const users = new UserRepository(),
    doctors = new DoctorRepository(),
    availability = new AvailabilityRepository(),
    appointments = new AppointmentRepository(),
    feedback = new FeedbackRepository();
  const locks = new ScheduleLock(),
    events = new EventBus();
  const authService = new AuthService(users);
  const doctorService = new DoctorService(doctors, users, availability);
  const schedulingService = new SchedulingService(
    users,
    doctors,
    appointments,
    availability,
    locks,
    events,
  );
  const adminService = new AdminService(
    users,
    doctors,
    availability,
    appointments,
    doctorService,
    locks,
    events,
  );
  const feedbackService = new FeedbackService(feedback);
  const auth = new AuthController(authService),
    doctor = new DoctorController(authService, doctorService, schedulingService),
    appointment = new AppointmentController(schedulingService),
    admin = new AdminController(adminService, authService),
    feedbackController = new FeedbackController(feedbackService);
  const loggedIn = authenticate(authService);
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.NODE_ENV === 'test' ? 1000 : 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'יותר מדי ניסיונות. נסו שוב מאוחר יותר.' } },
  });
  router.post('/auth/register', authLimiter, auth.register);
  router.post('/auth/login', authLimiter, auth.login);
  router.post('/auth/logout', auth.logout);
  router.get('/auth/me', loggedIn, auth.me);
  router.patch('/auth/me', loggedIn, auth.profile);
  router.get('/doctors', doctor.doctors);
  router.get('/doctors/:id/availability', doctor.availability);
  router.get('/appointments', loggedIn, appointment.appointments);
  router.post('/appointments', loggedIn, appointment.book);
  router.patch('/appointments/:id/cancel', loggedIn, appointment.cancel);
  router.patch('/appointments/:id/visit', loggedIn, appointment.visit);
  router.get('/patients/:id/history', loggedIn, appointment.history);
  router.post('/feedback', loggedIn, feedbackController.feedback);
  router.use('/admin', loggedIn, requireRole('admin'));
  router.get('/admin/feedback', feedbackController.feedbackList);
  router.get('/admin/users', admin.users);
  router.post('/admin/patients', admin.createPatient);
  router.post('/admin/doctors', admin.createDoctor);
  router.patch('/admin/doctors/:id', admin.updateDoctor);
  router.patch('/admin/users/:id', admin.updateUser);
  router.get('/events', (_req, res) => events.subscribe(res));
  return router;
}
