import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, File, Eye } from 'lucide-react';
import { Card, CardBody, Button, Chip, Progress } from '@heroui/react';

interface MultiFileUploadProps {
    files: File[];
    onFilesChange: (files: File[]) => void;
    existingFiles?: string[];
    onRemoveExistingFile?: (fileUrl: string) => void;
    accept?: string;
    maxFiles?: number;
    maxSizeInMB?: number;
    label?: string;
    description?: string;
    required?: boolean;
    disabled?: boolean;
}

export default function MultiFileUpload({
    files,
    onFilesChange,
    existingFiles = [],
    onRemoveExistingFile,
    accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx',
    maxFiles = 10,
    maxSizeInMB = 10,
    label = 'Upload Files',
    description = 'Drag and drop files here, or click to browse',
    required = false,
    disabled = false
}: MultiFileUploadProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [previewFile, setPreviewFile] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
            return <ImageIcon className="w-5 h-5" />;
        } else if (ext === 'pdf') {
            return <FileText className="w-5 h-5" />;
        }
        return <File className="w-5 h-5" />;
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const validateFile = (file: File): string | null => {
        // Check file size
        if (file.size > maxSizeInMB * 1024 * 1024) {
            return `File size exceeds ${maxSizeInMB}MB limit`;
        }

        // Check file type
        const acceptedTypes = accept.split(',').map(t => t.trim());
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!acceptedTypes.includes(fileExt)) {
            return `File type not accepted. Allowed: ${accept}`;
        }

        return null;
    };

    const handleFiles = (newFiles: FileList | null) => {
        if (!newFiles || disabled) return;

        const fileArray = Array.from(newFiles);
        const totalFiles = files.length + existingFiles.length + fileArray.length;

        if (totalFiles > maxFiles) {
            alert(`Maximum ${maxFiles} files allowed`);
            return;
        }

        const validFiles: File[] = [];
        const errors: string[] = [];

        fileArray.forEach(file => {
            const error = validateFile(file);
            if (error) {
                errors.push(`${file.name}: ${error}`);
            } else {
                validFiles.push(file);
            }
        });

        if (errors.length > 0) {
            alert('Some files were not added:\n' + errors.join('\n'));
        }

        if (validFiles.length > 0) {
            onFilesChange([...files, ...validFiles]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
        // Reset input to allow selecting the same file again
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        onFilesChange(newFiles);
    };

    const handlePreview = (fileUrl: string) => {
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
    };

    const totalFileCount = files.length + existingFiles.length;
    const canAddMore = totalFileCount < maxFiles;

    return (
        <div className="space-y-3">
            {/* Label */}
            <label className="block text-sm font-medium text-gray-700">
                {label}
                {required && <span className="text-red-600 ml-1">*</span>}
            </label>

            {/* Existing Files */}
            {existingFiles.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600">Existing Files:</p>
                    <div className="grid grid-cols-1 gap-2">
                        {existingFiles.map((fileUrl, index) => {
                            const fileName = fileUrl.split('/').pop()?.split('?')[0] || `File ${index + 1}`;
                            const decodedName = decodeURIComponent(fileName);
                            
                            return (
                                <Card key={index} className="border border-gray-200">
                                    <CardBody className="p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="text-blue-600 flex-shrink-0">
                                                    {getFileIcon(decodedName)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {decodedName}
                                                    </p>
                                                    <Chip size="sm" color="success" variant="flat" className="mt-1">
                                                        Uploaded
                                                    </Chip>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    color="primary"
                                                    onPress={() => handlePreview(fileUrl)}
                                                    title="View file"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                {onRemoveExistingFile && !disabled && (
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        color="danger"
                                                        onPress={() => onRemoveExistingFile(fileUrl)}
                                                        title="Remove file"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* New Files */}
            {files.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600">New Files to Upload:</p>
                    <div className="grid grid-cols-1 gap-2">
                        {files.map((file, index) => (
                            <Card key={index} className="border border-gray-200">
                                <CardBody className="p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="text-gray-600 flex-shrink-0">
                                                {getFileIcon(file.name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {file.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {formatFileSize(file.size)}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            color="danger"
                                            onPress={() => removeFile(index)}
                                            isDisabled={disabled}
                                            title="Remove file"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Upload Area */}
            {canAddMore && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !disabled && fileInputRef.current?.click()}
                    className={`
                        relative border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer
                        ${isDragOver
                            ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={accept}
                        onChange={handleFileInputChange}
                        className="hidden"
                        disabled={disabled}
                    />
                    
                    <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                    
                    <p className="text-sm font-medium text-gray-700 mb-1">
                        {description}
                    </p>
                    
                    <p className="text-xs text-gray-500">
                        {accept.split(',').join(', ').toUpperCase()} up to {maxSizeInMB}MB
                    </p>
                    
                    {totalFileCount > 0 && (
                        <div className="mt-3">
                            <Chip size="sm" color="primary" variant="flat">
                                {totalFileCount} / {maxFiles} files
                            </Chip>
                        </div>
                    )}
                </div>
            )}

            {/* File count limit reached */}
            {!canAddMore && (
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">
                        Maximum file limit reached ({maxFiles} files)
                    </p>
                </div>
            )}
        </div>
    );
}

