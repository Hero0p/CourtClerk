const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Job = require('../models/Job');
const User = require('../models/User');
const { Chat } = require('../models/Chat');

// Community Home Page
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    let jobs;
    
    if (req.user.userType === 'client') {
      // Clients see their own job postings
      jobs = await Job.find({ client: req.user.id })
        .sort({ createdAt: -1 });
    } else {
      // Lawyers see all available jobs
      jobs = await Job.find({ status: 'open' })
        .sort({ createdAt: -1 })
        .populate('client', 'name');
    }
    
    res.render('community/index', {
      jobs,
      userType: req.user.userType
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/dashboard');
  }
});

// Create Job Form
router.get('/jobs/new', ensureAuthenticated, (req, res) => {
  // Only clients can create jobs
  if (req.user.userType !== 'client') {
    req.flash('error_msg', 'Only clients can create job postings');
    return res.redirect('/community');
  }
  
  res.render('community/new-job');
});

// Create Job
router.post('/jobs', ensureAuthenticated, async (req, res) => {
  try {
    // Only clients can create jobs
    if (req.user.userType !== 'client') {
      req.flash('error_msg', 'Only clients can create job postings');
      return res.redirect('/community');
    }
    
    const { title, description, budgetMin, budgetMax, category, skills } = req.body;
    
    // Convert skills string to array
    const skillsArray = skills.split(',').map(skill => skill.trim()).filter(Boolean);
    
    const newJob = new Job({
      title,
      description,
      client: req.user.id,
      budget: {
        min: budgetMin,
        max: budgetMax
      },
      category,
      skills: skillsArray
    });
    
    await newJob.save();
    
    req.flash('success_msg', 'Job posted successfully');
    res.redirect('/community');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/community/jobs/new');
  }
});

// View Job
router.get('/jobs/:id', ensureAuthenticated, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('client', 'name email')
      .populate('applications.lawyer', 'name email profilePicture hourlyRate specialization');
    
    if (!job) {
      req.flash('error_msg', 'Job not found');
      return res.redirect('/community');
    }
    
    // Check if user has already applied (for lawyers)
    let hasApplied = false;
    if (req.user.userType === 'lawyer') {
      hasApplied = job.applications.some(app => 
        app.lawyer._id.toString() === req.user.id
      );
    }
    
    res.render('community/job-details', {
      job,
      isOwner: job.client._id.toString() === req.user.id,
      hasApplied,
      userType: req.user.userType
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/community');
  }
});

// Apply for Job
router.post('/jobs/:id/apply', ensureAuthenticated, async (req, res) => {
  try {
    // Only lawyers can apply for jobs
    if (req.user.userType !== 'lawyer') {
      req.flash('error_msg', 'Only lawyers can apply for jobs');
      return res.redirect(`/community/jobs/${req.params.id}`);
    }
    
    const { coverLetter, proposedRate } = req.body;
    
    const job = await Job.findById(req.params.id);
    
    if (!job || job.status !== 'open') {
      req.flash('error_msg', 'Job not found or not open for applications');
      return res.redirect('/community');
    }
    
    // Check if already applied
    const alreadyApplied = job.applications.some(app => 
      app.lawyer.toString() === req.user.id
    );
    
    if (alreadyApplied) {
      req.flash('error_msg', 'You have already applied for this job');
      return res.redirect(`/community/jobs/${req.params.id}`);
    }
    
    // Add application
    job.applications.push({
      lawyer: req.user.id,
      coverLetter,
      proposedRate
    });
    
    await job.save();
    
    req.flash('success_msg', 'Application submitted successfully');
    res.redirect(`/community/jobs/${req.params.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred');
    res.redirect(`/community/jobs/${req.params.id}`);
  }
});

// Accept Application
router.post('/jobs/:jobId/applications/:appId/accept', ensureAuthenticated, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    
    // Check if job exists and user is the owner
    if (!job || job.client.toString() !== req.user.id) {
      req.flash('error_msg', 'Job not found or you are not authorized');
      return res.redirect('/community');
    }
    
    // Find the application
    const application = job.applications.id(req.params.appId);
    
    if (!application) {
      req.flash('error_msg', 'Application not found');
      return res.redirect(`/community/jobs/${req.params.jobId}`);
    }
    
    // Update application status
    application.status = 'accepted';
    
    // Update job status
    job.status = 'in_progress';
    
    await job.save();
    
    // Create a chat between client and lawyer
    const lawyer = await User.findById(application.lawyer);
    
    const newChat = new Chat({
      title: `Job: ${job.title}`,
      user: req.user.id,
      isAIChat: false,
      participants: [req.user.id, application.lawyer],
      messages: [{
        sender: req.user.id,
        content: `I've accepted your application for "${job.title}". Let's discuss the details.`
      }]
    });
    
    await newChat.save();
    
    // Create the same chat for the lawyer
    const lawyerChat = new Chat({
      title: `Job: ${job.title}`,
      user: application.lawyer,
      isAIChat: false,
      participants: [req.user.id, application.lawyer],
      messages: [{
        sender: req.user.id,
        content: `I've accepted your application for "${job.title}". Let's discuss the details.`
      }]
    });
    
    await lawyerChat.save();
    
    req.flash('success_msg', 'Application accepted and chat created');
    res.redirect(`/chats/${newChat.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred');
    res.redirect(`/community/jobs/${req.params.jobId}`);
  }
});

// Reject Application
router.post('/jobs/:jobId/applications/:appId/reject', ensureAuthenticated, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    
    // Check if job exists and user is the owner
    if (!job || job.client.toString() !== req.user.id) {
      req.flash('error_msg', 'Job not found or you are not authorized');
      return res.redirect('/community');
    }
    
    // Find the application
    const application = job.applications.id(req.params.appId);
    
    if (!application) {
      req.flash('error_msg', 'Application not found');
      return res.redirect(`/community/jobs/${req.params.jobId}`);
    }
    
    // Update application status
    application.status = 'rejected';
    
    await job.save();
    
    req.flash('success_msg', 'Application rejected');
    res.redirect(`/community/jobs/${req.params.jobId}`);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred');
    res.redirect(`/community/jobs/${req.params.jobId}`);
  }
});

// Mark Job as Completed
router.post('/jobs/:id/complete', ensureAuthenticated, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    // Check if job exists and user is the owner
    if (!job || job.client.toString() !== req.user.id) {
      req.flash('error_msg', 'Job not found or you are not authorized');
      return res.redirect('/community');
    }
    
    // Update job status
    job.status = 'completed';
    
    await job.save();
    
    req.flash('success_msg', 'Job marked as completed');
    res.redirect('/community');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred');
    res.redirect(`/community/jobs/${req.params.id}`);
  }
});

// Browse Lawyers
router.get('/lawyers', ensureAuthenticated, async (req, res) => {
  try {
    // Only clients can browse lawyers
    if (req.user.userType !== 'client') {
      req.flash('error_msg', 'Only clients can browse lawyers');
      return res.redirect('/community');
    }
    
    const lawyers = await User.find({ userType: 'lawyer' })
      .select('name profilePicture hourlyRate specialization location bio');
    
    res.render('community/lawyers', {
      lawyers
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/community');
  }
});

// View Lawyer Profile
router.get('/lawyers/:id', ensureAuthenticated, async (req, res) => {
  try {
    const lawyer = await User.findById(req.params.id);
    
    if (!lawyer || lawyer.userType !== 'lawyer') {
      req.flash('error_msg', 'Lawyer not found');
      return res.redirect('/community/lawyers');
    }
    
    res.render('community/lawyer-profile', {
      lawyer
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/community/lawyers');
  }
});

module.exports = router; 