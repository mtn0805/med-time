import { doctorDto, type DoctorRecord } from '../mappers/dto.js';
import { UserRepository } from '../repositories/user.repository.js';
import { DoctorRepository } from '../repositories/doctor.repository.js';
import { AvailabilityRepository } from '../repositories/availability.repository.js';
/** Assembles public doctor profiles without exposing persistence or authentication details. */
export class DoctorService {
  constructor(
    private doctors: DoctorRepository,
    private users: UserRepository,
    private availability: AvailabilityRepository,
  ) {}
  async present(doctor: DoctorRecord) {
    // Sequential: this method is also called inside MongoDB transactions.
    const user = await this.users.getById(String(doctor.userId));
    const schedule = await this.availability.getByDoctorId(String(doctor._id));
    return doctorDto(doctor, user, schedule);
  }
  async list(search?: string, specialty?: string, includeInactive = false) {
    const rows = await this.doctors.list(specialty, includeInactive);
    const profiles = await Promise.all(rows.map((doctor) => this.present(doctor)));
    return profiles.filter(
      (profile) =>
        (includeInactive || profile.active) &&
        (!search ||
          `${profile.name} ${profile.specialty}`
            .toLocaleLowerCase()
            .includes(search.toLocaleLowerCase())),
    );
  }
}
