class CampusUser {
  final String id;
  final String email;
  final String? phone;
  final String role; // SUPER_ADMIN | ADMIN | TEACHER | STUDENT | PARENT | ACCOUNTANT
  final String status;
  final String? schoolName;

  CampusUser({
    required this.id,
    required this.email,
    required this.role,
    required this.status,
    this.phone,
    this.schoolName,
  });

  factory CampusUser.fromJson(Map<String, dynamic> json) {
    return CampusUser(
      id: json['id'],
      email: json['email'],
      phone: json['phone'],
      role: json['role'],
      status: json['status'],
      schoolName: json['school'] != null ? json['school']['name'] : null,
    );
  }

  bool get isParent => role == 'PARENT';
  bool get isStudent => role == 'STUDENT';
  bool get isTeacher => role == 'TEACHER';
}
