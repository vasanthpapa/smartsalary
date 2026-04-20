let mockEmployees = [
    { id: 'E1', name: 'Arunkumar', role: 'Web developer', dept: 'Operations', salary: 18200, checkin: '09:00', weekoffs: [0] },
    { id: 'E2', name: 'Sireesha', role: 'RM', dept: 'Operations', salary: 17010, checkin: '09:00', weekoffs: [0] },
    { id: 'E3', name: 'Vasanth', role: 'Data Admin', dept: 'Operations', salary: 12000, checkin: 'flexible', weekoffs: [0] },
    { id: 'E4', name: 'Devesh', role: 'Media Admin', dept: 'Operations', salary: 15348, checkin: '09:00', weekoffs: [0] },
    { id: 'E5', name: 'Naresh', role: 'Media', dept: 'Operations', salary: 12000, checkin: '09:00', weekoffs: [0] },
    { id: 'E6', name: 'Shruthi', role: 'Media', dept: 'Operations', salary: 11000, checkin: '09:00', weekoffs: [0] },
    { id: 'E7', name: 'Ragavi', role: 'Media', dept: 'Operations', salary: 10000, checkin: '09:00', weekoffs: [0] },
    { id: 'E8', name: 'Vishnukumar', role: 'Data', dept: 'Operations', salary: 12000, checkin: '09:00', weekoffs: [0] },
    { id: 'E9', name: 'Vishnupriya', role: 'HouseKeeping', dept: 'Operations', salary: 5500, checkin: '08:30', weekoffs: [0] },
    { id: 'E10', name: 'Gunasri', role: 'RM', dept: 'Operations', salary: 10000, checkin: '09:00', weekoffs: [0] },
    { id: 'E11', name: 'Shanmugapriya', role: 'Media', dept: 'Operations', salary: 9000, checkin: '09:00', weekoffs: [0] },
    { id: 'E12', name: 'Gokul', role: 'Cook & Field', dept: 'Operations', salary: 15000, checkin: '08:00', weekoffs: [0] },
    { id: 'E13', name: 'Sivasankari', role: 'Cook', dept: 'Operations', salary: 9000, checkin: '08:30', weekoffs: [0] },
    { id: 'E14', name: 'Meena', role: 'HouseKeeper', dept: 'Operations', salary: 8000, checkin: '08:00', weekoffs: [0] },
    { id: 'E15', name: 'Jayamala', role: 'HouseKeeper', dept: 'Operations', salary: 8000, checkin: '08:00', weekoffs: [0] },
    { id: 'E16', name: 'Girija', role: 'Helper', dept: 'Operations', salary: 5500, checkin: '08:00', weekoffs: [0] },
    { id: 'E17', name: 'Prathap', role: 'Driver', dept: 'Operations', salary: 12000, checkin: '08:00', weekoffs: [0] },
    { id: 'E18', name: 'Rajesh', role: 'Field Work', dept: 'Operations', salary: 12000, checkin: '08:00', weekoffs: [0] },
    { id: 'E19', name: 'Gopinath', role: 'Field Work', dept: 'Operations', salary: 10000, checkin: '08:00', weekoffs: [0] },
    { id: 'E20', name: 'Sarala', role: 'HouseKeeper', dept: 'Operations', salary: 7000, checkin: '08:00', weekoffs: [0] },
    { id: 'E21', name: 'Avinesh', role: 'Field Work', dept: 'Operations', salary: 10000, checkin: '08:00', weekoffs: [0] },
    { id: 'E22', name: 'Mohandass', role: 'Field Work', dept: 'Operations', salary: 9000, checkin: '08:00', weekoffs: [0] },
    { id: 'E23', name: 'Sanjay', role: 'Field Work', dept: 'Operations', salary: 10000, checkin: '08:00', weekoffs: [0] }
];

let mockAttendance = {};
let mockRules = { grace: 10, lateN: 3, lateType: 'halfday', lateFixed: 500 };

module.exports = { mockEmployees, mockAttendance, mockRules };
