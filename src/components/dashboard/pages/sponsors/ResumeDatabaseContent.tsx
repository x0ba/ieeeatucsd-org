import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../../../firebase/client';
import { useAuthState } from 'react-firebase-hooks/auth';
import { AlertCircle, Search, FileText, Users, GraduationCap, Briefcase, Filter, X, CheckSquare, Square, Download } from 'lucide-react';
import type { User as FirestoreUser, UserRole } from '../../shared/types/firestore';
import { SponsorPermissionService } from './utils/sponsorPermissions';
import DashboardHeader from '../../shared/DashboardHeader';
import JSZip from 'jszip';

interface UserWithResume extends Partial<FirestoreUser> {
    id: string;
    name: string;
    email: string;
    major?: string;
    graduationYear?: number;
    resume?: string;
    role: UserRole;
    position?: string;
}

export default function ResumeDatabaseContent() {
    const [user] = useAuthState(auth);
    const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
    const [sponsorTier, setSponsorTier] = useState<string | null>(null);
    const [users, setUsers] = useState<UserWithResume[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserWithResume[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMajor, setSelectedMajor] = useState<string>('all');
    const [selectedOfficerStatus, setSelectedOfficerStatus] = useState<string>('all');
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [selectedUserForModal, setSelectedUserForModal] = useState<UserWithResume | null>(null);

    // Fetch current user role and sponsor tier
    useEffect(() => {
        if (!user) return;

        const fetchUserRole = async () => {
            try {
                const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', user.uid)));
                if (!userDoc.empty) {
                    const userData = userDoc.docs[0].data();
                    setCurrentUserRole(userData.role || 'Member');
                    setSponsorTier(userData.sponsorTier || null);
                }
            } catch (error) {
                console.error('Error fetching user role:', error);
                setCurrentUserRole('Member');
            }
        };

        fetchUserRole();
    }, [user]);

    // Fetch users with resumes
    useEffect(() => {
        if (!user || !currentUserRole) return;

        const fetchUsers = async () => {
            try {
                setLoading(true);
                setError(null);

                // Query all users - no opt-in required
                const usersRef = collection(db, 'users');
                const querySnapshot = await getDocs(usersRef);

                const usersData: UserWithResume[] = querySnapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as UserWithResume))
                    .filter(u => u.resume); // Only include users with resumes

                setUsers(usersData);
                setFilteredUsers(usersData);
            } catch (err: any) {
                console.error('Error fetching users:', err);
                setError('Failed to load resume database: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [user, currentUserRole]);

    // Filter users based on search and filters
    useEffect(() => {
        let filtered = [...users];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(u =>
                u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.major?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Major filter
        if (selectedMajor !== 'all') {
            filtered = filtered.filter(u => u.major === selectedMajor);
        }

        // Officer status filter
        if (selectedOfficerStatus === 'officers') {
            filtered = filtered.filter(u =>
                u.role !== 'Member' && u.role !== 'Sponsor'
            );
        } else if (selectedOfficerStatus === 'members') {
            filtered = filtered.filter(u => u.role === 'Member');
        }

        setFilteredUsers(filtered);
    }, [searchTerm, selectedMajor, selectedOfficerStatus, users]);

    // Get unique majors for filter
    const uniqueMajors = Array.from(new Set(users.map(u => u.major).filter(Boolean))).sort();

    // Selection handlers
    const handleSelectAll = () => {
        if (selectedUsers.size === filteredUsers.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
        }
    };

    const handleSelectUser = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const handleRowClick = (user: UserWithResume) => {
        setSelectedUserForModal(user);
        setShowResumeModal(true);
    };

    const handleCloseModal = () => {
        setShowResumeModal(false);
        setSelectedUserForModal(null);
    };

    const handleDownloadSelected = async () => {
        const selectedUsersList = filteredUsers.filter(u => selectedUsers.has(u.id));

        if (selectedUsersList.length === 0) return;

        if (selectedUsersList.length === 1) {
            // Download single PDF
            const user = selectedUsersList[0];
            if (user.resume) {
                const link = document.createElement('a');
                link.href = user.resume;
                link.download = `${user.name.replace(/\s+/g, '_')}_Resume.pdf`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } else {
            // Download multiple PDFs as ZIP
            try {
                const zip = new JSZip();

                // Fetch all PDFs
                const fetchPromises = selectedUsersList.map(async (user) => {
                    if (!user.resume) return;

                    try {
                        const response = await fetch(user.resume);
                        const blob = await response.blob();
                        const fileName = `${user.name.replace(/\s+/g, '_')}_Resume.pdf`;
                        zip.file(fileName, blob);
                    } catch (err) {
                        console.error(`Failed to fetch resume for ${user.name}:`, err);
                    }
                });

                await Promise.all(fetchPromises);

                // Generate ZIP file
                const zipBlob = await zip.generateAsync({ type: 'blob' });

                // Download ZIP
                const link = document.createElement('a');
                link.href = URL.createObjectURL(zipBlob);
                link.download = `Resumes_${selectedUsersList.length}_users.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            } catch (err) {
                console.error('Failed to create ZIP:', err);
                alert('Failed to download resumes. Please try again.');
            }
        }
    };

    // Check if user has access
    if (currentUserRole && !SponsorPermissionService.hasSponsorAccess(currentUserRole, sponsorTier as any)) {
        return (
            <div className="flex-1 overflow-auto">
                <DashboardHeader
                    title="Access Denied"
                    subtitle="You don't have permission to access this page"
                />
                <div className="p-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <div className="flex items-center">
                            <AlertCircle className="h-8 w-8 text-red-600" />
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-red-800">Access Restricted</h3>
                                <p className="text-red-700">
                                    {currentUserRole === 'Sponsor' && sponsorTier === 'Bronze'
                                        ? 'Bronze tier sponsors do not have access to the resume database. Please upgrade to Silver tier or above.'
                                        : 'Only Silver tier (or above) Sponsors and Administrators can access the resume database.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto">
            <DashboardHeader
                title="Resume Database"
                subtitle="Browse resumes from IEEE members"
            />

            <div className="p-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-600">Total Resumes</p>
                                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <GraduationCap className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-600">Unique Majors</p>
                                <p className="text-2xl font-bold text-gray-900">{uniqueMajors.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <Briefcase className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-600">Officers</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {users.filter(u => u.role !== 'Member' && u.role !== 'Sponsor').length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or major..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Major Filter */}
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <select
                                value={selectedMajor}
                                onChange={(e) => setSelectedMajor(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                            >
                                <option value="all">All Majors</option>
                                {uniqueMajors.map(major => (
                                    <option key={major} value={major}>{major}</option>
                                ))}
                            </select>
                        </div>

                        {/* Officer Status Filter */}
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <select
                                value={selectedOfficerStatus}
                                onChange={(e) => setSelectedOfficerStatus(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                            >
                                <option value="all">All Members</option>
                                <option value="officers">Officers Only</option>
                                <option value="members">General Members</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Results */}
                {loading ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading resumes...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <div className="flex items-center">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                            <p className="ml-3 text-red-700">{error}</p>
                        </div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Resumes Found</h3>
                        <p className="text-gray-600">
                            {searchTerm || selectedMajor !== 'all' || selectedOfficerStatus !== 'all'
                                ? 'Try adjusting your filters'
                                : 'No members have opted in to share their resumes yet'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Selection Actions */}
                        {selectedUsers.size > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-blue-700">
                                        <strong>{selectedUsers.size}</strong> user{selectedUsers.size !== 1 ? 's' : ''} selected
                                    </p>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={handleDownloadSelected}
                                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download {selectedUsers.size === 1 ? 'Resume' : 'as ZIP'}
                                        </button>
                                        <button
                                            onClick={() => setSelectedUsers(new Set())}
                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Clear Selection
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left">
                                                <button
                                                    onClick={handleSelectAll}
                                                    className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                                                >
                                                    {selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 ? (
                                                        <CheckSquare className="w-5 h-5" />
                                                    ) : (
                                                        <Square className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Email
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Major
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Graduation Year
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Role
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredUsers.map((user) => (
                                            <tr
                                                key={user.id}
                                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                                            >
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelectUser(user.id);
                                                    }}
                                                >
                                                    <div className="flex items-center justify-center">
                                                        {selectedUsers.has(user.id) ? (
                                                            <CheckSquare className="w-5 h-5 text-blue-600" />
                                                        ) : (
                                                            <Square className="w-5 h-5 text-gray-600 hover:text-gray-900" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap"
                                                    onClick={() => handleRowClick(user)}
                                                >
                                                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                </td>
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap"
                                                    onClick={() => handleRowClick(user)}
                                                >
                                                    <div className="text-sm text-gray-600">{user.email}</div>
                                                </td>
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap"
                                                    onClick={() => handleRowClick(user)}
                                                >
                                                    <div className="text-sm text-gray-900 max-w-[200px] truncate" title={user.major || 'N/A'}>
                                                        {user.major || 'N/A'}
                                                    </div>
                                                </td>
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap"
                                                    onClick={() => handleRowClick(user)}
                                                >
                                                    <div className="text-sm text-gray-900">{user.graduationYear || 'N/A'}</div>
                                                </td>
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap"
                                                    onClick={() => handleRowClick(user)}
                                                >
                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'Member' ? 'bg-gray-100 text-gray-800' :
                                                        user.role === 'General Officer' ? 'bg-blue-100 text-blue-800' :
                                                            user.role === 'Executive Officer' ? 'bg-purple-100 text-purple-800' :
                                                                user.role === 'Administrator' ? 'bg-red-100 text-red-800' :
                                                                    'bg-green-100 text-green-800'
                                                        }`}>
                                                        {user.position || user.role}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* Resume Modal */}
                {showResumeModal && selectedUserForModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedUserForModal.name}</h2>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {selectedUserForModal.email} • {selectedUserForModal.major || 'N/A'} • Class of {selectedUserForModal.graduationYear || 'N/A'}
                                    </p>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-6 h-6 text-gray-600" />
                                </button>
                            </div>

                            {/* Modal Body - Resume Viewer */}
                            <div className="flex-1 overflow-auto p-6">
                                {selectedUserForModal.resume ? (
                                    <iframe
                                        src={selectedUserForModal.resume}
                                        className="w-full h-full min-h-[600px] border border-gray-300 rounded-lg"
                                        title={`${selectedUserForModal.name}'s Resume`}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-64">
                                        <div className="text-center">
                                            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-600">No resume available</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-between p-6 border-t border-gray-200">
                                <div className="flex items-center space-x-2">
                                    <span className={`px-3 py-1.5 inline-flex text-sm font-semibold rounded-full ${selectedUserForModal.role === 'Member' ? 'bg-gray-100 text-gray-800' :
                                        selectedUserForModal.role === 'General Officer' ? 'bg-blue-100 text-blue-800' :
                                            selectedUserForModal.role === 'Executive Officer' ? 'bg-purple-100 text-purple-800' :
                                                selectedUserForModal.role === 'Administrator' ? 'bg-red-100 text-red-800' :
                                                    'bg-green-100 text-green-800'
                                        }`}>
                                        {selectedUserForModal.position || selectedUserForModal.role}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    {selectedUserForModal.resume && (
                                        <a
                                            href={selectedUserForModal.resume}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Open in New Tab
                                        </a>
                                    )}
                                    <button
                                        onClick={handleCloseModal}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

