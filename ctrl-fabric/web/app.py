"""Flask web application for Ctrl+Fabric dashboard."""

import os
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///ctrl_fabric.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


# Models
class Garment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    versions = db.relationship('Version', backref='garment', lazy=True)


class Version(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    garment_id = db.Column(db.Integer, db.ForeignKey('garment.id'), nullable=False)
    version = db.Column(db.String(20), nullable=False)
    release_date = db.Column(db.DateTime, default=datetime.utcnow)
    changes = db.Column(db.Text)
    specs = db.Column(db.Text)


class Issue(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    author = db.Column(db.String(100))
    status = db.Column(db.String(20), default='open')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    garment_id = db.Column(db.Integer, db.ForeignKey('garment.id'))


class PullRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    author = db.Column(db.String(100))
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    garment_id = db.Column(db.Integer, db.ForeignKey('garment.id'))


# Routes
@app.route('/')
def index():
    garments = Garment.query.all()
    return render_template('index.html', garments=garments)


@app.route('/garments/<sku>')
def garment_detail(sku):
    garment = Garment.query.filter_by(sku=sku).first_or_404()
    return render_template('garment.html', garment=garment)


@app.route('/issues')
def issues():
    issues = Issue.query.filter_by(status='open').all()
    return render_template('issues.html', issues=issues)


@app.route('/issues/new', methods=['GET', 'POST'])
def new_issue():
    if request.method == 'POST':
        issue = Issue(
            title=request.form['title'],
            description=request.form['description'],
            author=request.form.get('author', 'Anonymous')
        )
        db.session.add(issue)
        db.session.commit()
        return redirect(url_for('issues'))
    return render_template('new_issue.html')


@app.route('/pull-requests')
def pull_requests():
    prs = PullRequest.query.all()
    return render_template('pull_requests.html', prs=prs)


@app.route('/api/garments')
def api_garments():
    garments = Garment.query.all()
    return jsonify([{
        'sku': g.sku,
        'name': g.name,
        'category': g.category
    } for g in garments])


@app.route('/api/garments/<sku>/specs')
def api_garment_specs(sku):
    garment = Garment.query.filter_by(sku=sku).first_or_404()
    latest_version = Version.query.filter_by(garment_id=garment.id).order_by(Version.id.desc()).first()
    return jsonify({
        'sku': garment.sku,
        'name': garment.name,
        'specs': latest_version.specs if latest_version else {}
    })


@app.route('/api/garments/<sku>/pattern')
def api_garment_pattern(sku):
    """Generate pattern for a garment."""
    from ctrl_fabric.agents import CADAagent
    import json
    
    garment = Garment.query.filter_by(sku=sku).first_or_404()
    latest_version = Version.query.filter_by(garment_id=garment.id).order_by(Version.id.desc()).first()
    
    specs = json.loads(latest_version.specs) if latest_version and latest_version.specs else {}
    size = request.args.get('size', 'M')
    
    cad_agent = CADAagent()
    result = cad_agent.run(sku, specs, generate_pattern=True, size=size)
    
    return jsonify({
        'sku': sku,
        'size': size,
        'pattern': result['pattern'],
        'simulation': result['simulation']
    })


@app.route('/garments/<sku>/simulate')
def garment_simulate(sku):
    """Render 3D simulation page."""
    garment = Garment.query.filter_by(sku=sku).first_or_404()
    return render_template('simulation.html', garment=garment)


@app.route('/garments/<sku>/docs')
def garment_docs(sku):
    """Render documentation page."""
    garment = Garment.query.filter_by(sku=sku).first_or_404()
    return render_template('docs.html', garment=garment)


@app.route('/garments/<sku>/quality')
def garment_quality(sku):
    """Render quality & sustainability page."""
    garment = Garment.query.filter_by(sku=sku).first_or_404()
    return render_template('quality.html', garment=garment)


@app.route('/api/garments/<sku>/docs')
def api_garment_docs(sku):
    """Generate documentation for a garment."""
    from ctrl_fabric.agents import DocumentationAgent
    import json
    
    garment = Garment.query.filter_by(sku=sku).first_or_404()
    latest_version = Version.query.filter_by(garment_id=garment.id).order_by(Version.id.desc()).first()
    
    specs = json.loads(latest_version.specs) if latest_version and latest_version.specs else {}
    
    doc_agent = DocumentationAgent()
    result = doc_agent.run(sku, specs)
    
    return jsonify(result)


@app.route('/analytics')
def analytics():
    """Render analytics dashboard."""
    return render_template('analytics.html')


@app.route('/api/analytics')
def api_analytics():
    """Run analytics and return results."""
    from ctrl_fabric.agents import DataScientistAgent
    
    # Sample data for demo
    sales_data = [
        {"category": "t-shirts", "amount": 29.99},
        {"category": "hoodies", "amount": 59.99},
        {"category": "t-shirts", "amount": 29.99},
        {"category": "pants", "amount": 49.99},
    ]
    
    customer_data = [
        {"total_spent": 150, "segment": "trend_focused"},
        {"total_spent": 450, "segment": "value"},
        {"total_spent": 750, "segment": "premium"},
    ]
    
    ds_agent = DataScientistAgent()
    result = ds_agent.run(sales_data, customer_data)
    
    return jsonify(result)


@app.route('/api/garments/<sku>/quality')
def api_garment_quality(sku):
    """Run quality tests for a garment."""
    from ctrl_fabric.agents import QualityAssuranceAgent
    import json
    
    garment = Garment.query.filter_by(sku=sku).first_or_404()
    latest_version = Version.query.filter_by(garment_id=garment.id).order_by(Version.id.desc()).first()
    
    specs = json.loads(latest_version.specs) if latest_version and latest_version.specs else {}
    
    qa_agent = QualityAssuranceAgent()
    result = qa_agent.run(sku, specs)
    
    return jsonify(result)


@app.route('/api/garments/<sku>/sustainability')
def api_garment_sustainability(sku):
    """Calculate sustainability metrics for a garment."""
    from ctrl_fabric.agents import SustainabilityAgent
    import json
    
    garment = Garment.query.filter_by(sku=sku).first_or_404()
    latest_version = Version.query.filter_by(garment_id=garment.id).order_by(Version.id.desc()).first()
    
    specs = json.loads(latest_version.specs) if latest_version and latest_version.specs else {}
    
    sustain_agent = SustainabilityAgent()
    result = sustain_agent.run(sku, specs)
    
    return jsonify(result)


def init_db():
    """Initialize database with sample data."""
    with app.app_context():
        db.create_all()
        
        # Add sample garments
        if Garment.query.count() == 0:
            tee = Garment(sku='TEE-4.2', name='Essential T-Shirt', category='tops')
            hoodie = Garment(sku='HOODIE-2.0', name='Technical Hoodie', category='outerwear')
            db.session.add_all([tee, hoodie])
            db.session.commit()
            
            # Add versions
            v1 = Version(garment_id=tee.id, version='1.0', changes='Initial release', 
                        specs='{"weight_gsm": 210, "thermal_efficiency": 7.8}')
            v2 = Version(garment_id=hoodie.id, version='2.0', changes='Fabric updated, Improved collar',
                        specs='{"weight_gsm": 420, "thermal_efficiency": 8.5}')
            db.session.add_all([v1, v2])
            db.session.commit()


if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)