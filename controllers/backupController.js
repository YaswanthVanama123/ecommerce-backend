import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import mongoose from 'mongoose';
import AdminActivityLog from '../models/AdminActivityLog.js';

const execPromise = promisify(exec);

// Mock backup model (in production, store in database)
const backups = [];
let backupSettings = {
  autoBackupEnabled: false,
  backupFrequency: 'daily',
  retentionDays: 30
};

// Get all backups
export const getBackups = async (req, res) => {
  try {
    // In production, fetch from database
    // For now, return mock data
    res.json(backups);
  } catch (error) {
    console.error('Get backups error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create backup
export const createBackup = async (req, res) => {
  try {
    const timestamp = Date.now();
    const filename = `backup_${timestamp}.gz`;
    const backupPath = path.join(process.cwd(), 'backups', filename);

    // Create backups directory if it doesn't exist
    const backupsDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Get MongoDB connection string
    const mongoUri = process.env.MONGODB_URI;

    // Create backup using mongodump
    // Note: This requires mongodump to be installed on the system
    const command = `mongodump --uri="${mongoUri}" --archive="${backupPath}" --gzip`;

    try {
      await execPromise(command);
    } catch (error) {
      console.error('Mongodump error:', error);
      // If mongodump is not available, create a simple JSON backup
      const collections = await mongoose.connection.db.listCollections().toArray();
      const data = {};

      for (const collection of collections) {
        const collectionData = await mongoose.connection.db
          .collection(collection.name)
          .find({})
          .toArray();
        data[collection.name] = collectionData;
      }

      fs.writeFileSync(
        backupPath.replace('.gz', '.json'),
        JSON.stringify(data, null, 2)
      );
    }

    // Get file size
    const stats = fs.existsSync(backupPath)
      ? fs.statSync(backupPath)
      : fs.statSync(backupPath.replace('.gz', '.json'));

    const backup = {
      _id: timestamp.toString(),
      filename,
      type: 'manual',
      size: stats.size,
      createdAt: new Date(),
      createdBy: {
        id: req.user._id,
        name: `${req.user.firstName} ${req.user.lastName}`
      }
    };

    backups.unshift(backup);

    // Log the activity
    await AdminActivityLog.log({
      user: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      action: 'backup_created',
      resource: {
        type: 'backup',
        id: backup._id,
        name: filename
      },
      description: `Created database backup: ${filename}`,
      severity: 'high',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json(backup);
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Download backup
export const downloadBackup = async (req, res) => {
  try {
    const backup = backups.find(b => b._id === req.params.id);

    if (!backup) {
      return res.status(404).json({ message: 'Backup not found' });
    }

    const backupPath = path.join(process.cwd(), 'backups', backup.filename);
    const jsonPath = backupPath.replace('.gz', '.json');

    const filePath = fs.existsSync(backupPath) ? backupPath : jsonPath;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Backup file not found' });
    }

    res.download(filePath, backup.filename);
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Restore backup
export const restoreBackup = async (req, res) => {
  try {
    const backup = backups.find(b => b._id === req.params.id);

    if (!backup) {
      return res.status(404).json({ message: 'Backup not found' });
    }

    const backupPath = path.join(process.cwd(), 'backups', backup.filename);
    const jsonPath = backupPath.replace('.gz', '.json');

    const filePath = fs.existsSync(backupPath) ? backupPath : jsonPath;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Backup file not found' });
    }

    // Get MongoDB connection string
    const mongoUri = process.env.MONGODB_URI;

    if (fs.existsSync(backupPath)) {
      // Restore using mongorestore
      const command = `mongorestore --uri="${mongoUri}" --archive="${backupPath}" --gzip --drop`;

      try {
        await execPromise(command);
      } catch (error) {
        console.error('Mongorestore error:', error);
        throw new Error('Mongorestore failed. Please ensure mongorestore is installed.');
      }
    } else {
      // Restore from JSON
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      for (const [collectionName, documents] of Object.entries(data)) {
        const collection = mongoose.connection.db.collection(collectionName);
        await collection.deleteMany({});
        if (documents.length > 0) {
          await collection.insertMany(documents);
        }
      }
    }

    // Log the activity
    await AdminActivityLog.log({
      user: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      action: 'backup_restored',
      resource: {
        type: 'backup',
        id: backup._id,
        name: backup.filename
      },
      description: `Restored database from backup: ${backup.filename}`,
      severity: 'critical',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Backup restored successfully' });
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete backup
export const deleteBackup = async (req, res) => {
  try {
    const backupIndex = backups.findIndex(b => b._id === req.params.id);

    if (backupIndex === -1) {
      return res.status(404).json({ message: 'Backup not found' });
    }

    const backup = backups[backupIndex];
    const backupPath = path.join(process.cwd(), 'backups', backup.filename);
    const jsonPath = backupPath.replace('.gz', '.json');

    // Delete file
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath);
    }

    // Remove from array
    backups.splice(backupIndex, 1);

    // Log the activity
    await AdminActivityLog.log({
      user: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      action: 'backup_deleted',
      resource: {
        type: 'backup',
        id: backup._id,
        name: backup.filename
      },
      description: `Deleted backup: ${backup.filename}`,
      severity: 'high',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get backup settings
export const getBackupSettings = async (req, res) => {
  try {
    res.json(backupSettings);
  } catch (error) {
    console.error('Get backup settings error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update backup settings
export const updateBackupSettings = async (req, res) => {
  try {
    const { autoBackupEnabled, backupFrequency, retentionDays } = req.body;

    backupSettings = {
      autoBackupEnabled: autoBackupEnabled !== undefined ? autoBackupEnabled : backupSettings.autoBackupEnabled,
      backupFrequency: backupFrequency || backupSettings.backupFrequency,
      retentionDays: retentionDays !== undefined ? retentionDays : backupSettings.retentionDays
    };

    // Log the activity
    await AdminActivityLog.log({
      user: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      action: 'settings_updated',
      resource: {
        type: 'settings',
        name: 'Backup Settings'
      },
      description: 'Updated backup settings',
      severity: 'medium',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: backupSettings
    });

    res.json(backupSettings);
  } catch (error) {
    console.error('Update backup settings error:', error);
    res.status(500).json({ message: error.message });
  }
};
