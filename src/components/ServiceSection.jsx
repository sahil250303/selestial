import React from 'react';
import { MessageCircle, HelpCircle, Gift, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const ServiceSection = () => {
  const services = [
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "CUSTOMER SERVICE LIVE CHAT",
      description: "Need help? Speak to our Customer Service team via chat",
      cta: "START CHAT",
      link: "#" // Replace with actual chat link or handler
    },
    {
      icon: <HelpCircle className="w-8 h-8" />,
      title: "CUSTOMER SERVICE",
      description: "Explore answers to our FAQs or connect with our Customer Service team.",
      cta: "CONTACT US",
      link: "/contact" 
    },
    {
      icon: <Gift className="w-8 h-8" />,
      title: "GIFT SERVICES",
      description: "Add a personalized touch to your Selestial jewelry with our premium packaging.",
      cta: "EXPLORE GIFTS",
      link: "/gift-services"
    }
  ];

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-light tracking-[0.3em] text-center text-white mb-16">
          SELESTIAL SERVICES
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={index}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center group hover:bg-white/10 transition-all duration-500 hover:-translate-y-2"
            >
              <div className="text-silver-light mb-6 transform transition-transform group-hover:scale-110 duration-500">
                {service.icon}
              </div>
              
              <h3 className="text-sm font-medium tracking-widest text-white mb-4">
                {service.title}
              </h3>
              
              <p className="text-gray-400 text-sm leading-relaxed mb-8 min-h-[40px]">
                {service.description}
              </p>
              
              <Link 
                to={service.link}
                className="mt-auto flex items-center gap-2 text-xs font-semibold tracking-widest text-white border-b border-white/20 pb-1 hover:border-white transition-colors group/btn"
              >
                {service.cta}
                <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      </div>
      
      {/* Decorative background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-500/5 blur-[120px] -z-10 rounded-full" />
    </section>
  );
};

export default ServiceSection;
