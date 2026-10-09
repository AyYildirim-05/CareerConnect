const { JobPostingModel, CompanyModel, UserModel } = require('../models');

const REQUIRED_FIELDS = ['name', 'description'];

/**
 * Validate company form fields and return trimmed values
 * @param {Object} body - req.body
 * @returns {{ fields: Object, errors: Object }}
 */
function validateCompanyFields(body) {
  const fields = {};
  const errors = {};

  CompanyModel.FIELDS.forEach((name) => {
    fields[name] = typeof body[name] === 'string' ? body[name].trim() : '';
  });

  REQUIRED_FIELDS.forEach((name) => {
    if (!fields[name]) {
      errors[name] = `${name} is required.`;
    }
  });

  if (fields.size && !CompanyModel.COMPANY_SIZES.includes(fields.size)) {
    errors.size = `Company size must be one of: ${CompanyModel.COMPANY_SIZES.join(', ')}.`;
  }

  if (fields.website && !/^https?:\/\/\S+$/i.test(fields.website)) {
    errors.website = 'Website must start with http:// or https://';
  }

  return { fields, errors };
}

class CompanyController {
  /**
   * GET /api/companies
   * All companies, sorted by name
   */
  static async list(req, res) {
    try {
      const companies = await CompanyModel.findAll();
      return res.status(200).json({ companies });
    } catch (error) {
      console.error('List companies error:', error);
      return res.status(500).json({ error: 'Failed to fetch companies.' });
    }
  }

  /**
   * GET /api/companies/mine
   * The logged-in recruiter's company (owned or joined), or null if not set up yet
   */
  static async getMine(req, res) {
    try {
      let company = await CompanyModel.findByOwner(req.user.id);
      if (!company) {
        const user = await UserModel.findById(req.user.id);
        if (user && user.companyId) {
          company = await CompanyModel.findById(user.companyId);
        }
      }
      return res.status(200).json({ company });
    } catch (error) {
      console.error('Get my company error:', error);
      return res.status(500).json({ error: 'Failed to fetch your company.' });
    }
  }

  /**
   * POST /api/companies
   * Set up the logged-in recruiter's company (only one per recruiter)
   */
  static async create(req, res) {
    try {
      const existing = await CompanyModel.findByOwner(req.user.id);
      if (existing) {
        return res.status(409).json({ error: 'You already have a company page. Edit it instead.' });
      }
      const user = await UserModel.findById(req.user.id);
      if (user && user.companyId) {
        return res.status(409).json({ error: 'You are already a member of a company.' });
      }

      const { fields, errors } = validateCompanyFields(req.body);
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors });
      }

      const nameTaken = await CompanyModel.findByName(fields.name);
      if (nameTaken) {
        return res.status(409).json({ message: 'Validation failed', errors: { name: 'A company with this name already exists. You can join it instead.' } });
      }

      const company = await CompanyModel.create({ ownerId: req.user.id, fields });
      return res.status(201).json({ message: 'Company page created.', company });
    } catch (error) {
      console.error('Create company error:', error);
      return res.status(500).json({ message: 'Failed to create company page.' });
    }
  }

  /**
   * POST /api/companies/:id/join
   * Join an existing company as a member
   */
  static async join(req, res) {
    try {
      const owned = await CompanyModel.findByOwner(req.user.id);
      if (owned) {
        return res.status(409).json({ error: 'You already own a company.' });
      }
      const user = await UserModel.findById(req.user.id);
      if (user && user.companyId) {
        return res.status(409).json({ error: 'You are already a member of a company.' });
      }
      const company = await CompanyModel.findById(req.params.id);
      if (!company) {
        return res.status(404).json({ error: 'Company not found.' });
      }
      await UserModel.updateUser(req.user.id, { companyId: company.id });
      return res.status(200).json({ message: 'You have joined the company.', company });
    } catch (error) {
      console.error('Join company error:', error);
      return res.status(500).json({ error: 'Failed to join company.' });
    }
  }

  /**
   * PUT /api/companies/mine
   * Edit the logged-in recruiter's company
   */
  static async updateMine(req, res) {
    try {
      const company = await CompanyModel.findByOwner(req.user.id);
      if (!company) {
        return res.status(404).json({ error: 'You have not set up a company page yet.' });
      }

      const { fields, errors } = validateCompanyFields(req.body);
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors });
      }

      const nameTaken = await CompanyModel.findByName(fields.name);
      if (nameTaken && nameTaken.id !== company.id) {
        return res.status(409).json({ message: 'Validation failed', errors: { name: 'A company with this name already exists.' } });
      }

      const updatedCompany = await CompanyModel.update(company.id, fields);
      if (fields.name !== company.name) {
        await JobPostingModel.updateCompanyName(company.id, fields.name);
      }

      return res.status(200).json({ message: 'Company page updated.', company: updatedCompany });
    } catch (error) {
      console.error('Update company error:', error);
      return res.status(500).json({ message: 'Failed to update company page.' });
    }
  }

  /**
   * GET /api/companies/:id
   * A public company page: company details plus its published job postings
   */
  static async getById(req, res) {
    try {
      const company = await CompanyModel.findById(req.params.id);
      if (!company) {
        return res.status(404).json({ error: 'Company not found.' });
      }

      const jobs = await JobPostingModel.findPublishedByCompany(company.id);
      return res.status(200).json({ company, jobs });
    } catch (error) {
      console.error('Get company error:', error);
      return res.status(500).json({ error: 'Failed to fetch company page.' });
    }
  }
}

module.exports = CompanyController;
