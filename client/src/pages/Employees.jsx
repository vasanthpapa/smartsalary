import React, { useState } from 'react';
import axios from 'axios';
import { useWorkforce, DAYSHORT, API_BASE } from '../context/workforceShared';
import { Edit2, Trash2, PlusCircle, X } from 'lucide-react';

const Employees = () => {
    const { employees, saveEmployees } = useWorkforce();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEmp, setEditingEmp] = useState(null);
    const [saving, setSaving] = useState(false);
    const [biometricIds, setBiometricIds] = useState([]);
    const [fetchingBioIds, setFetchingBioIds] = useState(false);
    const [showBioDropdown, setShowBioDropdown] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        role: '',
        dept: '',
        salary: '',
        checkin: '09:00',
        weekoffs: []
    });

    const toggleAddEmp = () => {
        setEditingEmp(null);
        setFormData({
            id: '',
            name: '',
            role: '',
            dept: '',
            salary: '',
            checkin: '09:00',
            weekoffs: []
        });
        setShowBioDropdown(false);
        setIsFormOpen(!isFormOpen);
        if (!isFormOpen) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.querySelector('.main')?.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleEdit = (emp) => {
        setEditingEmp(emp.id);
        setFormData({
            id: emp.id,
            name: emp.name,
            role: emp.role,
            dept: emp.dept,
            salary: emp.salary,
            checkin: emp.checkin || '09:00',
            weekoffs: emp.weekoffs || []
        });
        setShowBioDropdown(false);
        setIsFormOpen(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.querySelector('.main')?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this employee?")) return;
        const newEmployees = employees.filter(e => e.id !== id);
        try {
            setSaving(true);
            await saveEmployees(newEmployees);
        } catch (error) {
            console.error('Delete employee failed:', error);
            alert(error?.response?.data?.error || 'Unable to delete employee. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const toggleWeekoff = (dayIdx) => {
        setFormData(prev => ({
            ...prev,
            weekoffs: prev.weekoffs.includes(dayIdx) 
                ? prev.weekoffs.filter(d => d !== dayIdx) 
                : [...prev.weekoffs, dayIdx]
        }));
    };

    const fetchBiometricIds = async () => {
        try {
            setFetchingBioIds(true);
            const res = await axios.get(`${API_BASE}/api/employees/biometric-ids`);
            setBiometricIds(res.data);
            setShowBioDropdown(true);
        } catch (e) {
            console.error('Failed to fetch biometric IDs:', e);
            alert('Failed to fetch biometric IDs. Check server logs.');
        } finally {
            setFetchingBioIds(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.salary) {
            alert("Name and Salary are required!");
            return;
        }

        let newEmployees;
        if (editingEmp) {
            if (formData.id !== editingEmp && employees.some(e => e.id === formData.id)) {
                alert("Employee ID already exists!");
                return;
            }
            newEmployees = employees.map(e => e.id === editingEmp ? { ...formData } : e);
        } else {
            const newId = formData.id || 'E' + Date.now();
            if (employees.some(e => e.id === newId)) {
                alert("Employee ID already exists!");
                return;
            }
            const newEmp = { ...formData, id: newId };
            newEmployees = [...employees, newEmp];
        }

        try {
            setSaving(true);
            await saveEmployees(newEmployees);
            setIsFormOpen(false);
        } catch (error) {
            console.error('Save employee failed:', error);
            alert(error?.response?.data?.error || 'Unable to save employee. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="pg active">
            <div className="card">
                <div className="ch">
                    <span className="ct">Employee List</span>
                    <button className="primary-btn small-btn" style={{ width: 'auto' }} onClick={toggleAddEmp}>
                        <PlusCircle size={16} style={{ marginRight: '6px' }} />
                        Add Employee
                    </button>
                </div>

                {isFormOpen && (
                    <div className="card" style={{ background: 'var(--input-bg)', marginBottom: '1.5rem', animation: 'slideUpFade 0.3s forwards' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ color: 'var(--text-primary)' }}>{editingEmp ? 'Edit Employee' : 'Add New Employee'}</h4>
                            <button className="btn-icon" onClick={() => setIsFormOpen(false)}><X size={18} /></button>
                        </div>
                        
                        <div className="input-grid form-grid">
                            <div className="input-group">
                                <label>Employee ID</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {showBioDropdown ? (
                                        <select 
                                            value={formData.id} 
                                            onChange={(e) => {
                                                const selected = biometricIds.find(b => b.id === e.target.value);
                                                if (selected && !formData.name) {
                                                    setFormData({...formData, id: selected.id, name: selected.name});
                                                } else {
                                                    setFormData({...formData, id: e.target.value});
                                                }
                                            }}
                                            style={{ flex: 1, padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                        >
                                            <option value="">Select Biometric ID...</option>
                                            {biometricIds.map(b => (
                                                <option key={b.id} value={b.id}>{b.id} - {b.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input type="text" value={formData.id} onChange={(e) => setFormData({...formData, id: e.target.value})} placeholder="E12345" style={{ flex: 1 }} />
                                    )}
                                    <button 
                                        type="button" 
                                        className="secondary-btn small-btn" 
                                        onClick={fetchBiometricIds} 
                                        disabled={fetchingBioIds}
                                        style={{ width: 'auto', padding: '0 10px', height: '38px', margin: 0 }}
                                    >
                                        {fetchingBioIds ? 'Wait...' : 'Get Biometric'}
                                    </button>
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Full Name</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Jane Doe" />
                            </div>
                            <div className="input-group">
                                <label>Role</label>
                                <input type="text" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} placeholder="Software Engineer" />
                            </div>
                            <div className="input-group">
                                <label>Department</label>
                                <input type="text" value={formData.dept} onChange={(e) => setFormData({...formData, dept: e.target.value})} placeholder="Engineering" />
                            </div>
                            <div className="input-group">
                                <label>Basic Salary (₹/month)</label>
                                <input type="number" value={formData.salary} onChange={(e) => setFormData({...formData, salary: e.target.value})} placeholder="30000.50" step="0.01" />
                            </div>
                            <div className="input-group">
                                <label>Standard Check-in Time</label>
                                <input type="time" value={formData.checkin} onChange={(e) => setFormData({...formData, checkin: e.target.value})} />
                            </div>
                            <div className="input-group">
                                <label>Week-off Days</label>
                                <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                                    {DAYSHORT.map((day, idx) => (
                                        <span 
                                            key={idx} 
                                            className={`day-btn ${formData.weekoffs.includes(idx) ? 'selected' : ''}`}
                                            onClick={() => toggleWeekoff(idx)}
                                        >
                                            {day}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="action-row" style={{ marginTop: '1.5rem', display: 'flex', gap: '10px' }}>
                            <button className="primary-btn small-btn" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Employee'}
                            </button>
                            <button className="secondary-btn small-btn" onClick={() => setIsFormOpen(false)} disabled={saving}>Cancel</button>
                        </div>
                    </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Dept</th>
                                <th>Basic</th>
                                <th>Check-in</th>
                                <th>Week-offs</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id}>
                                    <td>{emp.id}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div className="av">{emp.name[0]}</div>
                                            <span>{emp.name}</span>
                                        </div>
                                    </td>
                                    <td>{emp.role}</td>
                                    <td>{emp.dept}</td>
                                    <td>₹{parseFloat(emp.salary).toLocaleString()}</td>
                                    <td>{emp.checkin}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '2px' }}>
                                            {emp.weekoffs?.map(w => (
                                                <span key={w} style={{ fontSize: '10px', background: 'var(--primary)', color: 'white', padding: '1px 4px', borderRadius: '4px' }}>{DAYSHORT[w]}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="btn-icon" onClick={() => handleEdit(emp)}><Edit2 size={16} /></button>
                                            <button className="btn-icon delete" onClick={() => handleDelete(emp.id)} disabled={saving}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Employees;
