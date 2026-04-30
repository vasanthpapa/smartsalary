let mockEmployees = [
    { id: '1011', name: 'Arunkumar', role: 'Web developer', dept: 'MBT', salary: 18200, checkin: '09:00', weekoffs: [0] },
    { id: 'E2', name: 'Sireesha', role: 'RM', dept: 'Operations', salary: 17010, checkin: '09:00', weekoffs: [0] },
    { id: '0102', name: 'Vasanth', role: 'Data Admin', dept: 'Smart', salary: 12000, checkin: 'flexible', weekoffs: [0] },
    { id: '1013', name: 'Devesh', role: 'Media Admin', dept: 'MBT', salary: 15348, checkin: '09:00', weekoffs: [0] },
    { id: '1014', name: 'Naresh', role: 'Media', dept: 'MBT', salary: 12000, checkin: '09:00', weekoffs: [0] },
    { id: '1015', name: 'Shruthi', role: 'Media', dept: 'MBT', salary: 11000, checkin: '09:00', weekoffs: [0] },
    { id: '1017', name: 'Ragavi', role: 'Media', dept: 'MBT', salary: 10000, checkin: '09:00', weekoffs: [0] },
    { id: '1018', name: 'Vishnukumar', role: 'Data', dept: 'MBT', salary: 12000, checkin: '09:00', weekoffs: [0] },
    { id: '1019', name: 'Vishnupriya', role: 'HouseKeeping', dept: 'MBT', salary: 5500, checkin: '08:30', weekoffs: [0] },
    { id: '1021', name: 'Gunasri', role: 'RM', dept: 'MBT', salary: 10000, checkin: '09:00', weekoffs: [0] },
    { id: '1023', name: 'Shanmugapriya', role: 'Media', dept: 'MBT', salary: 9000, checkin: '09:00', weekoffs: [0] },
    { id: '2011', name: 'Gokul', role: 'Cook & Field', dept: 'Smart', salary: 15000, checkin: '08:00', weekoffs: [0] },
    { id: '2012', name: 'Sivasankari', role: 'Cook', dept: 'Smart', salary: 9000, checkin: '08:30', weekoffs: [0] },
    { id: '2014', name: 'Meena', role: 'HouseKeeper', dept: 'Smart', salary: 8000, checkin: '08:00', weekoffs: [0] },
    { id: '2015', name: 'Jayamala', role: 'HouseKeeper', dept: 'Smart', salary: 8000, checkin: '08:00', weekoffs: [0] },
    { id: '2016', name: 'Girija', role: 'Helper', dept: 'Smart', salary: 5500, checkin: '08:00', weekoffs: [0] },
    { id: '2017', name: 'Prathap', role: 'Driver', dept: 'Smart', salary: 12000, checkin: '08:00', weekoffs: [0] },
    { id: '2018', name: 'Rajesh', role: 'Field Work', dept: 'Smart', salary: 12000, checkin: '08:00', weekoffs: [0] },
    { id: '00002024', name: 'Gopinath', role: 'Field Work', dept: 'Smart', salary: 10000, checkin: '08:00', weekoffs: [0] },
    { id: '2025', name: 'Sarala', role: 'HouseKeeper', dept: 'Smart', salary: 7000, checkin: '08:00', weekoffs: [0] },
    { id: '00002026', name: 'Avinesh', role: 'Field Work', dept: 'Smart', salary: 10000, checkin: '08:00', weekoffs: [0] },
    { id: 'E22', name: 'Mohandass', role: 'Field Work', dept: 'Smart', salary: 9000, checkin: '08:00', weekoffs: [0] },
    { id: '2027', name: 'Sanjay', role: 'Field Work', dept: 'Smart', salary: 10000, checkin: '08:00', weekoffs: [0] }
];

let mockAttendance = {};
let mockRules = { grace: 10, lateN: 3, lateType: 'halfday', lateFixed: 500 };

module.exports = { mockEmployees, mockAttendance, mockRules };
